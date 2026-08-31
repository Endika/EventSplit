import {
  CloneIntoEventSchema,
  type CloneIntoEventInput,
} from '@/application/dtos/CloneIntoEventDTO'
import type { EventSnapshot } from '@/domain/entities/Event'
import { User, type ProfileUpdate } from '@/domain/entities/User'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { buildClonePatch, type CloneSelection } from '@/domain/services/buildClonePatch'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { MAX_OPTIONS, optionKey, sortOptions } from '@/domain/value-objects/DayOption'

function describeBlocks(
  selection: CloneSelection,
  people: { added: number; merged: number },
): string {
  const blocks: string[] = []
  if (selection.dayOptions) blocks.push('day options')
  // Merged people are not new arrivals, so they are counted apart: the history
  // has to be able to explain why the participant count did not move.
  if (people.added > 0) blocks.push(`${people.added} participant(s)`)
  if (people.merged > 0) blocks.push(`${people.merged} merged participant(s)`)
  if (selection.purchaseIds.length > 0) blocks.push(`${selection.purchaseIds.length} item(s)`)
  if (Object.values(selection.site).some(Boolean)) blocks.push('site details')
  return blocks.length > 0 ? blocks.join(', ') : 'nothing'
}

/** Fill in the gaps on participants a merge folded someone into, in place. */
function applyProfileUpdates(
  users: EventSnapshot['users'],
  updates: { userId: string; update: ProfileUpdate }[],
): EventSnapshot['users'] {
  if (updates.length === 0) return users
  const byId = new Map(updates.map((u) => [u.userId, u.update]))
  return users.map((u) => {
    const update = byId.get(u.id)
    return update ? User.restore(u).withProfile(update).toSnapshot() : u
  })
}

function mergeSubgroupOrder(
  current: Record<string, string[]>,
  incoming: Record<string, string[]>,
): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...current }
  for (const [group, subgroups] of Object.entries(incoming)) {
    merged[group] = [...new Set([...(merged[group] ?? []), ...subgroups])]
  }
  return merged
}

export class CloneIntoEventHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: CloneIntoEventInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = CloneIntoEventSchema.parse(input)
    if (parsed.sourceEventId === parsed.targetEventId)
      throw new Error('Cannot clone an event into itself')

    // Read the source once, outside the retry: it never changes here, and every
    // read of an event is a full blob download.
    const source = await this.repo.findById(parsed.sourceEventId)
    if (!source) throw new Error(`Source event ${parsed.sourceEventId} not found`)
    if (source.hasPin) throw new Error('Source event is PIN-protected and cannot be cloned')

    const saved = await withOptimisticRetry(this.repo, parsed.targetEventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.clonedBy))
        throw new Error(`clonedBy ${parsed.clonedBy} not in event`)

      const patch = buildClonePatch({
        source: source.snapshot,
        target: row.snapshot,
        selection: parsed.selection,
        clonedBy: parsed.clonedBy,
      })

      const existingKeys = new Set(row.snapshot.dayOptions.map(optionKey))
      const dayOptions = sortOptions([
        ...row.snapshot.dayOptions,
        ...patch.dayOptions.filter((o) => !existingKeys.has(optionKey(o))),
      ])
      if (dayOptions.length > MAX_OPTIONS)
        throw new Error(`Cloning would exceed the limit of ${MAX_OPTIONS} day options`)

      // availability is positional over dayOptions, so adding options means
      // rebuilding every row against the final list. Get this wrong and the
      // failure surfaces on the next vote save, far from here.
      const oldKeys = row.snapshot.dayOptions.map(optionKey)
      const availability = Object.fromEntries(
        Object.entries(row.snapshot.availability).map(([userId, votes]) => [
          userId,
          dayOptions.map((o) => {
            const i = oldKeys.indexOf(optionKey(o))
            return i >= 0 ? (votes[i] ?? false) : false
          }),
        ]),
      )

      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          ...patch.site,
          users: [...applyProfileUpdates(row.snapshot.users, patch.profileUpdates), ...patch.users],
          purchases: [...row.snapshot.purchases, ...patch.purchases],
          dayOptions,
          availability,
          groupOrder: [...new Set([...row.snapshot.groupOrder, ...patch.groupOrder])],
          subgroupOrder: mergeSubgroupOrder(row.snapshot.subgroupOrder, patch.subgroupOrder),
        },
        {
          type: 'cloned_from',
          userId: parsed.clonedBy,
          description: `Cloned ${describeBlocks(parsed.selection, {
            added: patch.users.length,
            // Everyone who resolved to an id but did not arrive as a new person.
            merged: Object.keys(patch.idMap).length - patch.users.length,
          })} from "${source.snapshot.name}"`,
        },
      )

      return nextSnapshot
    })

    return { event: saved.snapshot, version: saved.version }
  }
}
