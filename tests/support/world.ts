import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
import { DeleteManualLiquidationHandler } from '@/application/handlers/DeleteManualLiquidationHandler'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import type { EventSnapshot } from '@/domain/entities/Event'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { readEvent } from './readEvent'

export const GHOST = '018f4a8e-0000-7000-8000-000000000000'

/** A saved event with three participants, so lookups and replacements have a neighbour to get wrong. */
export interface World {
  repo: InMemoryEventRepository
  eventId: string
  john: string
  alice: string
  bob: string
}

export async function makeWorld(): Promise<World> {
  const repo = new InMemoryEventRepository()
  const created = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const eventId = created.event.id
  const join = async (name: string) =>
    (await new JoinAsNewUserHandler(repo).execute({ eventId, name })).newUser.id
  const alice = await join('Alice')
  const bob = await join('Bob')
  return { repo, eventId, john: created.creator.id, alice, bob }
}

export async function snapshotOf(w: World): Promise<EventSnapshot> {
  return (await readEvent(w.repo, w.eventId))!.snapshot
}

/** Rewrites the stored snapshot directly, for states no handler can reach. */
export async function rewrite(w: World, change: (s: EventSnapshot) => void): Promise<void> {
  const row = (await readEvent(w.repo, w.eventId))!
  change(row.snapshot)
  await w.repo.update(w.eventId, row.snapshot, row.version, null)
}

export async function addPurchase(
  w: World,
  item: string,
  over: Partial<Parameters<AddPurchaseHandler['execute']>[0]> = {},
): Promise<string> {
  const res = await new AddPurchaseHandler(w.repo).execute({
    eventId: w.eventId,
    createdBy: w.john,
    item,
    quantity: 1,
    unit: 'units',
    dailyConsumption: 1,
    consumers: [{ userId: w.john, multiplier: 1 }],
    days: 1,
    ...over,
  })
  return res.event.purchases.find((p) => p.item === item)!.id
}

export async function addExpense(
  w: World,
  description: string,
  over: Partial<Parameters<AddExpenseHandler['execute']>[0]> = {},
): Promise<string> {
  const res = await new AddExpenseHandler(w.repo).execute({
    eventId: w.eventId,
    paidBy: w.alice,
    amountEuros: 10,
    description,
    ...over,
  })
  return res.event.expenses.find((e) => e.description === description)!.id
}

export async function addLiquidation(
  w: World,
  concept: string,
  over: Partial<Parameters<AddManualLiquidationHandler['execute']>[0]> = {},
): Promise<string> {
  const res = await new AddManualLiquidationHandler(w.repo).execute({
    eventId: w.eventId,
    userId: w.john,
    concept,
    amountEuros: 40,
    paidBy: w.alice,
    affects: [w.john, w.alice],
    ...over,
  })
  return res.event.manualLiquidations.find((l) => l.concept === concept)!.id
}

export async function trashPurchase(w: World, purchaseId: string): Promise<void> {
  await new DeletePurchaseHandler(w.repo).execute({
    eventId: w.eventId,
    purchaseId,
    deletedBy: w.john,
  })
}

export async function trashExpense(w: World, expenseId: string): Promise<void> {
  await new DeleteExpenseHandler(w.repo).execute({
    eventId: w.eventId,
    expenseId,
    deletedBy: w.john,
  })
}

export async function trashLiquidation(w: World, liquidationId: string): Promise<void> {
  await new DeleteManualLiquidationHandler(w.repo).execute({
    eventId: w.eventId,
    userId: w.john,
    liquidationId,
  })
}

export function lastEntry(snapshot: EventSnapshot) {
  const { type, userId, description } = snapshot.history.at(-1)!
  return { type, userId, description }
}
