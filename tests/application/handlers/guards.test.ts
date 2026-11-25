import { describe, it, expect } from 'vitest'
import { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { AssignPurchaseHandler } from '@/application/handlers/AssignPurchaseHandler'
import { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
import { DeleteManualLiquidationHandler } from '@/application/handlers/DeleteManualLiquidationHandler'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { EditBroughtItemHandler } from '@/application/handlers/EditBroughtItemHandler'
import { EditExpenseHandler } from '@/application/handlers/EditExpenseHandler'
import { EditManualLiquidationHandler } from '@/application/handlers/EditManualLiquidationHandler'
import { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import { RecoverExpenseHandler } from '@/application/handlers/RecoverExpenseHandler'
import { RecoverManualLiquidationHandler } from '@/application/handlers/RecoverManualLiquidationHandler'
import { RecoverPurchaseHandler } from '@/application/handlers/RecoverPurchaseHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { ToggleLiquidationShareHandler } from '@/application/handlers/ToggleLiquidationShareHandler'
import {
  GHOST,
  addExpense,
  addLiquidation,
  addPurchase,
  makeWorld,
  rewrite,
  snapshotOf,
  trashExpense,
  trashLiquidation,
  trashPurchase,
} from '../../support/world'

/** Three people, plus a live and a trashed purchase, expense and manual liquidation. */
async function fixture() {
  const w = await makeWorld()
  const purchaseId = await addPurchase(w, 'Coke')
  const trashedPurchaseId = await addPurchase(w, 'Beer')
  await trashPurchase(w, trashedPurchaseId)
  const expenseId = await addExpense(w, 'Bread')
  const trashedExpenseId = await addExpense(w, 'Milk')
  await trashExpense(w, trashedExpenseId)
  const liquidationId = await addLiquidation(w, 'Deposit')
  const trashedLiquidationId = await addLiquidation(w, 'Rest')
  await trashLiquidation(w, trashedLiquidationId)
  return {
    ...w,
    purchaseId,
    trashedPurchaseId,
    expenseId,
    trashedExpenseId,
    liquidationId,
    trashedLiquidationId,
  }
}
type F = Awaited<ReturnType<typeof fixture>>

const purchaseInput = (f: F) => ({
  eventId: f.eventId,
  purchaseId: f.purchaseId,
  editedBy: f.john,
  item: 'Coke',
  quantity: 1,
  unit: 'units' as const,
  dailyConsumption: 1,
  consumers: [{ userId: f.john, multiplier: 1 }],
  days: 1,
})
const broughtInput = (f: F) => ({
  eventId: f.eventId,
  purchaseId: f.purchaseId,
  editedBy: f.john,
  item: 'Pan',
  quantity: 1,
  unit: 'units' as const,
})
const expenseInput = (f: F) => ({
  eventId: f.eventId,
  expenseId: f.expenseId,
  editedBy: f.john,
  paidBy: f.alice,
  amountEuros: 5,
  description: 'Bread',
})
const liquidationInput = (f: F) => ({
  eventId: f.eventId,
  userId: f.john,
  liquidationId: f.liquidationId,
  concept: 'Deposit',
  amountEuros: 40,
  paidBy: f.alice,
  affects: [f.john],
})

const guards: [string, (f: F) => Promise<unknown>, RegExp][] = [
  [
    'AddPurchase: creator',
    (f) =>
      new AddPurchaseHandler(f.repo).execute({
        ...purchaseInput(f),
        createdBy: GHOST,
        item: 'Fanta',
      }),
    /createdBy .* not in event/,
  ],
  [
    'AddPurchase: consumer',
    (f) =>
      new AddPurchaseHandler(f.repo).execute({
        ...purchaseInput(f),
        createdBy: f.john,
        item: 'Fanta',
        consumers: [{ userId: GHOST, multiplier: 1 }],
      }),
    /Consumer .* not in event/,
  ],
  [
    'AddBroughtItem: creator',
    (f) => new AddBroughtItemHandler(f.repo).execute({ ...broughtInput(f), createdBy: GHOST }),
    /createdBy .* not in event/,
  ],
  [
    'AddBroughtItem: bringer',
    (f) =>
      new AddBroughtItemHandler(f.repo).execute({
        ...broughtInput(f),
        createdBy: f.john,
        broughtBy: GHOST,
      }),
    /broughtBy .* not in event/,
  ],
  [
    'AddExpense: payer',
    (f) =>
      new AddExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        paidBy: GHOST,
        createdBy: f.john,
        amountEuros: 5,
        description: 'Fanta',
      }),
    /Payer .* not in event/,
  ],
  [
    'AddExpense: creator',
    (f) =>
      new AddExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        paidBy: f.john,
        createdBy: GHOST,
        amountEuros: 5,
        description: 'Fanta',
      }),
    /Creator .* not in event/,
  ],
  [
    'AddExpense: split member',
    (f) =>
      new AddExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        paidBy: f.john,
        amountEuros: 5,
        description: 'Fanta',
        splitAmong: [f.john, GHOST],
      }),
    /splitAmong user .* not in event/,
  ],
  [
    'AddExpense: linked purchase',
    (f) =>
      new AddExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        paidBy: f.john,
        amountEuros: 5,
        description: 'Fanta',
        purchaseLinks: [{ purchaseId: f.trashedPurchaseId, quantity: 1 }],
      }),
    /Link purchase .* not found/,
  ],
  [
    'AddManualLiquidation: actor',
    (f) =>
      new AddManualLiquidationHandler(f.repo).execute({
        ...liquidationInput(f),
        userId: GHOST,
        concept: 'Extra',
      }),
    /User .* not in event/,
  ],
  [
    'AddManualLiquidation: payer',
    (f) =>
      new AddManualLiquidationHandler(f.repo).execute({
        ...liquidationInput(f),
        paidBy: GHOST,
        concept: 'Extra',
      }),
    /Payer .* not in event/,
  ],
  [
    'AddManualLiquidation: affected',
    (f) =>
      new AddManualLiquidationHandler(f.repo).execute({
        ...liquidationInput(f),
        affects: [f.john, GHOST],
        concept: 'Extra',
      }),
    /affects user .* not in event/,
  ],
  [
    'AssignPurchase: editor',
    (f) =>
      new AssignPurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: f.purchaseId,
        editedBy: GHOST,
        assignedTo: null,
        purchased: false,
      }),
    /editedBy .* not in event/,
  ],
  [
    'AssignPurchase: buyer',
    (f) =>
      new AssignPurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: f.purchaseId,
        editedBy: f.john,
        assignedTo: GHOST,
        purchased: false,
      }),
    /assignedTo .* not in event/,
  ],
  [
    'AssignPurchase: unknown purchase',
    (f) =>
      new AssignPurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: GHOST,
        editedBy: f.john,
        assignedTo: null,
        purchased: false,
      }),
    /Purchase .* not found/,
  ],
  [
    'EditPurchase: editor',
    (f) => new EditPurchaseHandler(f.repo).execute({ ...purchaseInput(f), editedBy: GHOST }),
    /editedBy .* not in event/,
  ],
  [
    'EditPurchase: consumer',
    (f) =>
      new EditPurchaseHandler(f.repo).execute({
        ...purchaseInput(f),
        consumers: [{ userId: GHOST, multiplier: 1 }],
      }),
    /Consumer .* not in event/,
  ],
  [
    'EditPurchase: unknown purchase',
    (f) => new EditPurchaseHandler(f.repo).execute({ ...purchaseInput(f), purchaseId: GHOST }),
    /Purchase .* not found/,
  ],
  [
    'EditPurchase: trashed purchase',
    (f) =>
      new EditPurchaseHandler(f.repo).execute({
        ...purchaseInput(f),
        purchaseId: f.trashedPurchaseId,
      }),
    /Cannot edit a deleted purchase/,
  ],
  [
    'EditBroughtItem: editor',
    (f) => new EditBroughtItemHandler(f.repo).execute({ ...broughtInput(f), editedBy: GHOST }),
    /editedBy .* not in event/,
  ],
  [
    'EditBroughtItem: bringer',
    (f) => new EditBroughtItemHandler(f.repo).execute({ ...broughtInput(f), broughtBy: GHOST }),
    /broughtBy .* not in event/,
  ],
  [
    'EditBroughtItem: unknown purchase',
    (f) => new EditBroughtItemHandler(f.repo).execute({ ...broughtInput(f), purchaseId: GHOST }),
    /Purchase .* not found/,
  ],
  [
    'EditBroughtItem: trashed purchase',
    (f) =>
      new EditBroughtItemHandler(f.repo).execute({
        ...broughtInput(f),
        purchaseId: f.trashedPurchaseId,
      }),
    /Cannot edit a deleted purchase/,
  ],
  [
    'DeletePurchase: deleter',
    (f) =>
      new DeletePurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: f.purchaseId,
        deletedBy: GHOST,
      }),
    /deletedBy .* not in event/,
  ],
  [
    'DeletePurchase: unknown purchase',
    (f) =>
      new DeletePurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: GHOST,
        deletedBy: f.john,
      }),
    /Purchase .* not found/,
  ],
  [
    'DeletePurchase: trashed purchase',
    (f) =>
      new DeletePurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: f.trashedPurchaseId,
        deletedBy: f.john,
      }),
    /already-deleted purchase/,
  ],
  [
    'RecoverPurchase: recoverer',
    (f) =>
      new RecoverPurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: f.trashedPurchaseId,
        recoveredBy: GHOST,
      }),
    /recoveredBy .* not in event/,
  ],
  [
    'RecoverPurchase: unknown purchase',
    (f) =>
      new RecoverPurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: GHOST,
        recoveredBy: f.john,
      }),
    /Purchase .* not found/,
  ],
  [
    'RecoverPurchase: creator left the event',
    async (f) => {
      await rewrite(f, (s) => {
        s.purchases.find((p) => p.id === f.trashedPurchaseId)!.createdBy = GHOST
      })
      return new RecoverPurchaseHandler(f.repo).execute({
        eventId: f.eventId,
        purchaseId: f.trashedPurchaseId,
        recoveredBy: f.john,
      })
    },
    /creator is no longer in the event/,
  ],
  [
    'EditExpense: editor',
    (f) => new EditExpenseHandler(f.repo).execute({ ...expenseInput(f), editedBy: GHOST }),
    /editedBy .* not in event/,
  ],
  [
    'EditExpense: payer',
    (f) => new EditExpenseHandler(f.repo).execute({ ...expenseInput(f), paidBy: GHOST }),
    /Payer .* not in event/,
  ],
  [
    'EditExpense: split member',
    (f) =>
      new EditExpenseHandler(f.repo).execute({ ...expenseInput(f), splitAmong: [f.john, GHOST] }),
    /splitAmong user .* not in event/,
  ],
  [
    'EditExpense: unknown expense',
    (f) => new EditExpenseHandler(f.repo).execute({ ...expenseInput(f), expenseId: GHOST }),
    /Expense .* not found/,
  ],
  [
    'EditExpense: trashed expense',
    (f) =>
      new EditExpenseHandler(f.repo).execute({
        ...expenseInput(f),
        expenseId: f.trashedExpenseId,
      }),
    /Cannot edit a deleted expense/,
  ],
  [
    'EditExpense: linked purchase',
    (f) =>
      new EditExpenseHandler(f.repo).execute({
        ...expenseInput(f),
        purchaseLinks: [{ purchaseId: f.trashedPurchaseId, quantity: 1 }],
      }),
    /Link purchase .* not found/,
  ],
  [
    'DeleteExpense: deleter',
    (f) =>
      new DeleteExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        expenseId: f.expenseId,
        deletedBy: GHOST,
      }),
    /deletedBy .* not in event/,
  ],
  [
    'DeleteExpense: unknown expense',
    (f) =>
      new DeleteExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        expenseId: GHOST,
        deletedBy: f.john,
      }),
    /Expense .* not found/,
  ],
  [
    'DeleteExpense: trashed expense',
    (f) =>
      new DeleteExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        expenseId: f.trashedExpenseId,
        deletedBy: f.john,
      }),
    /already-deleted expense/,
  ],
  [
    'RecoverExpense: recoverer',
    (f) =>
      new RecoverExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        expenseId: f.trashedExpenseId,
        recoveredBy: GHOST,
      }),
    /recoveredBy .* not in event/,
  ],
  [
    'RecoverExpense: unknown expense',
    (f) =>
      new RecoverExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        expenseId: GHOST,
        recoveredBy: f.john,
      }),
    /Expense .* not found/,
  ],
  [
    'RecoverExpense: payer left the event',
    async (f) => {
      await rewrite(f, (s) => {
        s.expenses.find((e) => e.id === f.trashedExpenseId)!.paidBy = GHOST
      })
      return new RecoverExpenseHandler(f.repo).execute({
        eventId: f.eventId,
        expenseId: f.trashedExpenseId,
        recoveredBy: f.john,
      })
    },
    /payer is no longer in the event/,
  ],
  [
    'EditManualLiquidation: actor',
    (f) =>
      new EditManualLiquidationHandler(f.repo).execute({ ...liquidationInput(f), userId: GHOST }),
    /User .* not in event/,
  ],
  [
    'EditManualLiquidation: payer',
    (f) =>
      new EditManualLiquidationHandler(f.repo).execute({ ...liquidationInput(f), paidBy: GHOST }),
    /Payer .* not in event/,
  ],
  [
    'EditManualLiquidation: affected',
    (f) =>
      new EditManualLiquidationHandler(f.repo).execute({
        ...liquidationInput(f),
        affects: [GHOST],
      }),
    /affects user .* not in event/,
  ],
  [
    'EditManualLiquidation: unknown liquidation',
    (f) =>
      new EditManualLiquidationHandler(f.repo).execute({
        ...liquidationInput(f),
        liquidationId: GHOST,
      }),
    /Manual liquidation .* not found/,
  ],
  [
    'DeleteManualLiquidation: actor',
    (f) =>
      new DeleteManualLiquidationHandler(f.repo).execute({
        eventId: f.eventId,
        userId: GHOST,
        liquidationId: f.liquidationId,
      }),
    /User .* not in event/,
  ],
  [
    'DeleteManualLiquidation: unknown liquidation',
    (f) =>
      new DeleteManualLiquidationHandler(f.repo).execute({
        eventId: f.eventId,
        userId: f.john,
        liquidationId: GHOST,
      }),
    /Manual liquidation .* not found/,
  ],
  [
    'DeleteManualLiquidation: trashed liquidation',
    (f) =>
      new DeleteManualLiquidationHandler(f.repo).execute({
        eventId: f.eventId,
        userId: f.john,
        liquidationId: f.trashedLiquidationId,
      }),
    /already-deleted manual liquidation/,
  ],
  [
    'RecoverManualLiquidation: actor',
    (f) =>
      new RecoverManualLiquidationHandler(f.repo).execute({
        eventId: f.eventId,
        userId: GHOST,
        liquidationId: f.trashedLiquidationId,
      }),
    /User .* not in event/,
  ],
  [
    'RecoverManualLiquidation: unknown liquidation',
    (f) =>
      new RecoverManualLiquidationHandler(f.repo).execute({
        eventId: f.eventId,
        userId: f.john,
        liquidationId: GHOST,
      }),
    /Manual liquidation .* not found/,
  ],
  [
    'ToggleLiquidationShare: actor',
    (f) =>
      new ToggleLiquidationShareHandler(f.repo).execute({
        eventId: f.eventId,
        userId: GHOST,
        liquidationId: f.liquidationId,
        shareUserId: f.john,
      }),
    /User .* not in event/,
  ],
  [
    'ToggleLiquidationShare: unknown liquidation',
    (f) =>
      new ToggleLiquidationShareHandler(f.repo).execute({
        eventId: f.eventId,
        userId: f.john,
        liquidationId: GHOST,
        shareUserId: f.john,
      }),
    /Manual liquidation .* not found/,
  ],
  [
    'ToggleLiquidationShare: share outside the liquidation',
    (f) =>
      new ToggleLiquidationShareHandler(f.repo).execute({
        eventId: f.eventId,
        userId: f.john,
        liquidationId: f.liquidationId,
        shareUserId: f.bob,
      }),
    /not in liquidation affects/,
  ],
  [
    'UpdateProfile: guardian outside the event',
    (f) =>
      new UpdateProfileHandler(f.repo).execute({
        eventId: f.eventId,
        userId: f.bob,
        actorId: f.bob,
        kind: 'child',
        guardianId: GHOST,
      }),
    /Guardian .* is not in this event/,
  ],
  [
    'SetAvailabilityBatch: editor',
    (f) =>
      new SetAvailabilityBatchHandler(f.repo).execute({
        eventId: f.eventId,
        editedBy: GHOST,
        votes: {},
      }),
    /editedBy .* not in event/,
  ],
  [
    'SetAvailabilityBatch: voter',
    (f) =>
      new SetAvailabilityBatchHandler(f.repo).execute({
        eventId: f.eventId,
        editedBy: f.john,
        votes: { [GHOST]: [] },
      }),
    /User .* not in event/,
  ],
  [
    'SetAvailabilityBatch: wrong vote count',
    (f) =>
      new SetAvailabilityBatchHandler(f.repo).execute({
        eventId: f.eventId,
        editedBy: f.john,
        votes: { [f.john]: [true] },
      }),
    /length \(1\) must match option count \(0\)/,
  ],
]

describe('handler guards', () => {
  it.each(guards)('%s is refused and appends no history', async (_name, run, expected) => {
    const f = await fixture()
    const before = (await snapshotOf(f)).history.length
    await expect(run(f)).rejects.toThrow(expected)
    expect((await snapshotOf(f)).history).toHaveLength(before)
  })
})
