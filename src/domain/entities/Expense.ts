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
}

export class Expense {
  private constructor(private readonly s: ExpenseSnapshot) {}

  static create(input: {
    paidBy: string
    amount: Money
    description: string
    purchaseId?: string | null
    date?: Date
  }): Expense {
    const description = input.description.trim()
    if (description.length < 3 || description.length > 100)
      throw new Error('Expense: description must be 3..100 chars')
    if (input.amount.cents <= 0) throw new Error('Expense: amount must be > 0')
    return new Expense({
      id: uuidv7(),
      paidBy: input.paidBy,
      cents: input.amount.cents,
      currency: 'EUR',
      description,
      purchaseId: input.purchaseId ?? null,
      date: (input.date ?? new Date()).toISOString(),
      createdAt: new Date().toISOString(),
    })
  }

  static restore(s: ExpenseSnapshot): Expense {
    return new Expense(s)
  }

  get id(): string { return this.s.id }
  get paidBy(): string { return this.s.paidBy }
  get amount(): Money { return Money.fromCents(this.s.cents) }

  toSnapshot(): ExpenseSnapshot { return { ...this.s } }
}
