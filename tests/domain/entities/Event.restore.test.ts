import { describe, it, expect } from 'vitest'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { Expense } from '@/domain/entities/Expense'
import { ManualLiquidation } from '@/domain/entities/ManualLiquidation'
import { Purchase } from '@/domain/entities/Purchase'
import { User } from '@/domain/entities/User'
import { Money } from '@/domain/value-objects/Money'

function without<T extends object>(value: T, ...keys: string[]): T {
  const copy = { ...value } as Record<string, unknown>
  for (const key of keys) delete copy[key]
  return copy as T
}

describe('Event.restore', () => {
  it('loads every child of a legacy snapshot exactly as that child restores itself', () => {
    const creator = User.create({ name: 'John' })
    const uid = creator.id.value
    const event = Event.create({ name: 'Trip', creator }).toSnapshot()
    const purchase = without(
      Purchase.create({
        createdBy: uid,
        item: 'Bread',
        quantity: 1,
        unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: uid, multiplier: 1 }],
        days: 2,
      }).toSnapshot(),
      'kind',
      'assignedTo',
      'purchased',
      'boughtQuantity',
      'group',
      'subgroup',
    )
    const expense = without(
      Expense.create({
        paidBy: uid,
        amount: Money.fromEuros(10),
        description: 'Bread',
      }).toSnapshot(),
      'splitAmong',
      'purchaseLinks',
      'deleted',
      'deletedBy',
      'deletedAt',
    )
    const liquidation = without(
      ManualLiquidation.create({
        concept: 'Rent',
        amount: Money.fromEuros(400),
        paidBy: null,
        affects: [uid],
      }).toSnapshot(),
      'affects',
      'paidShares',
      'paidBy',
      'deleted',
      'deletedBy',
      'deletedAt',
    )
    const user = without(
      creator.toSnapshot(),
      'email',
      'phone',
      'allergies',
      'dietary',
      'notes',
      'kind',
      'guardianId',
      'household',
    )
    const legacy = {
      ...event,
      purchases: [purchase],
      expenses: [expense],
      manualLiquidations: [liquidation],
      users: [user],
    } as EventSnapshot

    const restored = Event.restore(legacy).toSnapshot()

    expect(restored.purchases).toEqual([Purchase.restore(purchase).toSnapshot()])
    expect(restored.expenses).toEqual([Expense.restore(expense).toSnapshot()])
    expect(restored.manualLiquidations).toEqual([
      ManualLiquidation.restore(liquidation).toSnapshot(),
    ])
    expect(restored.users).toEqual([User.restore(user).toSnapshot()])
  })
})
