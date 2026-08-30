import type { EventLocation, EventSnapshot } from '@/domain/entities/Event'
import { User, type UserSnapshot } from '@/domain/entities/User'
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
  /** Source user id → the fresh id it got here. */
  idMap: Record<string, string>
}

/**
 * Works out what to append to an event when cloning blocks out of another one.
 * Pure: no repository, no clock beyond what the entities stamp, so the whole
 * "what gets copied and how it lands" decision is testable on its own.
 *
 * Two rules carry most of the weight:
 * - Anything that points at a person is dropped, except who brings an item —
 *   that survives only if the person came over in this same clone.
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
  const { source, selection, clonedBy } = input

  const users: UserSnapshot[] = []
  const idMap: Record<string, string> = {}
  for (const sourceId of selection.userIds) {
    const u = source.users.find((x) => x.id === sourceId)
    if (!u) continue
    const created = User.create({ name: u.name, alias: u.alias, kind: u.kind }).toSnapshot()
    users.push({
      ...created,
      allergies: u.allergies.map((a) => ({ ...a })),
      dietary: u.dietary,
    })
    idMap[sourceId] = created.id
  }

  const purchases: PurchaseSnapshot[] = []
  for (const sourceId of selection.purchaseIds) {
    const p = source.purchases.find((x) => x.id === sourceId)
    if (!p || p.deleted) continue
    // Who brings it survives only if they were cloned as well.
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
    purchases,
    dayOptions,
    site,
    groupOrder: pruneGroupOrder(purchases, source.groupOrder),
    subgroupOrder: pruneSubgroupOrder(purchases, source.subgroupOrder),
    idMap,
  }
}
