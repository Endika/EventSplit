import type { EventLocation, EventSnapshot } from '@/domain/entities/Event'
import { User, type ProfileUpdate, type UserSnapshot } from '@/domain/entities/User'
import { Purchase, SHARED_UNIT, type PurchaseSnapshot } from '@/domain/entities/Purchase'
import {
  isValidOption,
  sortOptions,
  MAX_OPTIONS,
  type DayOption,
} from '@/domain/value-objects/DayOption'
import { pruneGroupOrder, pruneSubgroupOrder } from '@/domain/services/pruneGroupOrder'
import { inferPurchaseDays } from '@/domain/services/inferPurchaseDays'

/** What the user ticked in the clone dialog. Ids are the SOURCE event's ids. */
export type CloneSelection = {
  dayOptions: boolean
  userIds: string[]
  /**
   * Ids from `userIds` to fold into the same-named participant the target already
   * has, instead of adding a second one. An id here that is not ticked in
   * `userIds` is ignored: merging someone you are not bringing means nothing.
   */
  mergeUserIds: string[]
  purchaseIds: string[]
  site: {
    location: boolean
    emergencyContact: boolean
    wifiPassword: boolean
    generalNotes: boolean
  }
}

export type ClonePatch = {
  users: UserSnapshot[]
  /** Fields to fill in on participants the target already has. Ids are the TARGET's. */
  profileUpdates: { userId: string; update: ProfileUpdate }[]
  purchases: PurchaseSnapshot[]
  dayOptions: DayOption[]
  site: Partial<{
    location: EventLocation | null
    emergencyContact: string | null
    wifiPassword: string | null
    generalNotes: string | null
  }>
  groupOrder: string[]
  subgroupOrder: Record<string, string[]>
  /** Source user id → the id it resolves to here: a fresh one, or a merged-into one. */
  idMap: Record<string, string>
}

/** Mirrors `User.withProfile`, which is what ends up enforcing it. */
const MAX_ALLERGIES = 20

/**
 * The one definition of "these two are the same person", shared by the duplicate
 * warning in the dialog and by the merge itself. If these ever drifted apart the
 * app would warn about a duplicate it then refused to merge.
 */
export function matchDuplicate(
  name: string,
  users: readonly UserSnapshot[],
): UserSnapshot | undefined {
  const key = name.trim().toLowerCase()
  return users.find((u) => u.name.trim().toLowerCase() === key)
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === ''
}

/**
 * Fill the gaps, never overwrite: the target keeps every field it already filled
 * in, and only its empty ones take the source's value. Allergies are the
 * exception and union instead — two allergy lists are additive facts, not
 * competing opinions, and dropping one could put someone in hospital.
 *
 * `name` and `kind` are absent on purpose: the target always has both, so under
 * fill-the-gaps they could never change anyway.
 *
 * Returns null when there is nothing to fill, so an all-quiet merge writes no
 * history entry.
 */
function buildProfileFill(target: UserSnapshot, source: UserSnapshot): ProfileUpdate | null {
  const update: ProfileUpdate = {}
  if (isBlank(target.alias) && !isBlank(source.alias)) update.alias = source.alias
  if (isBlank(target.dietary) && !isBlank(source.dietary)) update.dietary = source.dietary
  if (isBlank(target.email) && !isBlank(source.email)) update.email = source.email
  if (isBlank(target.phone) && !isBlank(source.phone)) update.phone = source.phone
  if (isBlank(target.notes) && !isBlank(source.notes)) update.notes = source.notes

  const known = new Set(target.allergies.map((a) => a.name))
  const added = source.allergies.filter((a) => !known.has(a.name))
  const union = [...target.allergies, ...added].slice(0, MAX_ALLERGIES)
  // A target already at the cap gains nothing from the slice, and writing the
  // same list back would log a history entry for a change that did not happen.
  if (union.length > target.allergies.length) update.allergies = union.map((a) => ({ ...a }))

  return Object.keys(update).length > 0 ? update : null
}

/**
 * Works out what to append to an event when cloning blocks out of another one.
 * Pure: no repository, no clock beyond what the entities stamp, so the whole
 * "what gets copied and how it lands" decision is testable on its own.
 *
 * Three rules carry most of the weight:
 * - Anything that points at a person is dropped, except who brings an item —
 *   that survives only if the person resolved to someone here in this same clone.
 * - A ticked participant either arrives as a new person or merges into the
 *   same-named one already here. Either way `idMap` is what the rest of the
 *   patch reads, so items follow their carrier without knowing which happened.
 * - Quantities are recomputed by the entity, never copied: the cloner is the
 *   only consumer, so a copied total would contradict its own consumer list. The
 *   days each item was sized for are read back out of the source item, so a
 *   three-day item stays a three-day item for its new, smaller group.
 */
export function buildClonePatch(input: {
  source: EventSnapshot
  target: EventSnapshot
  selection: CloneSelection
  clonedBy: string
}): ClonePatch {
  const { source, target, selection, clonedBy } = input

  const users: UserSnapshot[] = []
  const idMap: Record<string, string> = {}
  // Keyed by target user id, so two source people merging into one accumulate
  // instead of the second silently undoing the first.
  const merged = new Map<string, { user: UserSnapshot; update: ProfileUpdate }>()

  for (const sourceId of selection.userIds) {
    const u = source.users.find((x) => x.id === sourceId)
    if (!u) continue

    if (selection.mergeUserIds.includes(sourceId)) {
      const twin = matchDuplicate(u.name, target.users)
      if (twin) {
        idMap[sourceId] = twin.id
        // Accumulate against what an earlier merge already filled in, so a second
        // source person folding into the same twin adds rather than overwrites.
        const current = merged.get(twin.id) ?? { user: twin, update: {} }
        const fill = buildProfileFill(current.user, u)
        if (fill)
          merged.set(twin.id, {
            user: { ...current.user, ...fill },
            update: { ...current.update, ...fill },
          })
        continue
      }
      // Asked to merge but nobody here matches: fall through and create.
    }

    const created = User.create({ name: u.name, alias: u.alias, kind: u.kind }).toSnapshot()
    users.push({
      ...created,
      allergies: u.allergies.map((a) => ({ ...a })),
      dietary: u.dietary,
    })
    idMap[sourceId] = created.id
  }

  const profileUpdates = [...merged.entries()].map(([userId, entry]) => ({
    userId,
    update: entry.update,
  }))

  const purchases: PurchaseSnapshot[] = []
  for (const sourceId of selection.purchaseIds) {
    const p = source.purchases.find((x) => x.id === sourceId)
    if (!p || p.deleted) continue
    // Who brings it survives only if they resolved to someone here.
    const assignedTo = p.assignedTo ? (idMap[p.assignedTo] ?? null) : null

    if (p.kind === 'bring') {
      purchases.push(
        Purchase.createBring({
          createdBy: clonedBy,
          item: p.item,
          quantity: p.quantity,
          unit: p.unit,
          group: p.group,
          subgroup: p.subgroup,
          broughtBy: assignedTo,
        }).toSnapshot(),
      )
      continue
    }

    purchases.push(
      Purchase.create({
        createdBy: clonedBy,
        item: p.item,
        quantity: p.quantity,
        unit: p.unit,
        dailyConsumption: p.dailyConsumption,
        // The cloner is the only consumer; the entity recomputes the total from
        // that. For SHARED_UNIT staples the quantity is fixed and survives as is.
        consumers: [{ userId: clonedBy, multiplier: 1 }],
        days: p.unit === SHARED_UNIT ? 1 : inferPurchaseDays(p),
        assignedTo,
        group: p.group,
        subgroup: p.subgroup,
      }).toSnapshot(),
    )
  }

  const dayOptions = selection.dayOptions
    ? sortOptions(source.dayOptions.filter(isValidOption))
        .slice(0, MAX_OPTIONS)
        .map((o) => ({ ...o }))
    : []

  // Only ticked fields land in the object, so the caller can spread it over the
  // target without blanking what it already had.
  const site: ClonePatch['site'] = {}
  if (selection.site.location) site.location = source.location ? { ...source.location } : null
  if (selection.site.emergencyContact) site.emergencyContact = source.emergencyContact
  if (selection.site.wifiPassword) site.wifiPassword = source.wifiPassword
  if (selection.site.generalNotes) site.generalNotes = source.generalNotes

  return {
    users,
    profileUpdates,
    purchases,
    dayOptions,
    site,
    groupOrder: pruneGroupOrder(purchases, source.groupOrder),
    subgroupOrder: pruneSubgroupOrder(purchases, source.subgroupOrder),
    idMap,
  }
}
