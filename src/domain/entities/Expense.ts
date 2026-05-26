import { uuidv7 } from 'uuidv7'
import { Money } from '@/domain/value-objects/Money'

export interface ExpenseSnapshot {
  id: string
  paidBy: string
  cents: number
  currency: 'EUR'
  description: string
  purchaseId: string | null
  date: string
  createdAt: string
  splitAmong: string[]  // empty array means "all current participants"
}

export class Expense {
  private constructor(private readonly s: ExpenseSnapshot) {}

  static create(input: {
    paidBy: string
    amount: Money
    description: string
    purchaseId?: string | null
    date?: Date
    splitAmong?: string[]
  }): Expense {
    const description = input.description.trim()
    if (description.length < 3 || description.length > 100)
      throw new Error('Expense: description must be 3..100 chars')
    if (input.amount.cents <= 0) throw new Error('Expense: amount must be > 0')
    const splitAmong = input.splitAmong ?? []
    if (new Set(splitAmong).size !== splitAmong.length)
      throw new Error('Expense: splitAmong must contain unique userIds')
    return new Expense({
      id: uuidv7(),
      paidBy: input.paidBy,
      cents: input.amount.cents,
      currency: 'EUR',
      description,
      purchaseId: input.purchaseId ?? null,
      date: (input.date ?? new Date()).toISOString(),
      createdAt: new Date().toISOString(),
      splitAmong,
    })
  }

  static restore(s: ExpenseSnapshot | Omit<ExpenseSnapshot, 'splitAmong'>): Expense {
    const full = s as ExpenseSnapshot
    return new Expense({
      ...full,
      splitAmong: full.splitAmong ?? [],
    })
  }

  get id(): string { return this.s.id }
  get paidBy(): string { return this.s.paidBy }
  get amount(): Money { return Money.fromCents(this.s.cents) }

  toSnapshot(): ExpenseSnapshot { return { ...this.s, splitAmong: [...this.s.splitAmong] } }
}
