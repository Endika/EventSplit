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
  purchaseLinks: { purchaseId: string; quantity: number }[]
  deleted: boolean
  deletedBy: string | null
  deletedAt: string | null
}

function validatePurchaseLinks(
  links: { purchaseId: string; quantity: number }[],
): { purchaseId: string; quantity: number }[] {
  for (const l of links) {
    if (l.quantity <= 0) throw new Error('Expense: link quantity must be > 0')
    if (!l.purchaseId) throw new Error('Expense: link purchaseId must be non-empty')
  }
  return links.map((l) => ({ ...l }))
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
    purchaseLinks?: { purchaseId: string; quantity: number }[]
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
      purchaseLinks: validatePurchaseLinks(input.purchaseLinks ?? []),
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
  }

  static restore(
    s:
      | ExpenseSnapshot
      | Omit<ExpenseSnapshot, 'splitAmong' | 'purchaseLinks' | 'deleted' | 'deletedBy' | 'deletedAt'>,
  ): Expense {
    const full = s as ExpenseSnapshot
    return new Expense({
      ...full,
      splitAmong: full.splitAmong ?? [],
      purchaseLinks: full.purchaseLinks ?? [],
      deleted: full.deleted ?? false,
      deletedBy: full.deletedBy ?? null,
      deletedAt: full.deletedAt ?? null,
    })
  }

  edit(input: {
    paidBy: string
    amount: Money
    description: string
    purchaseId?: string | null
    date?: Date
    splitAmong?: string[]
    purchaseLinks?: { purchaseId: string; quantity: number }[]
  }): Expense {
    const description = input.description.trim()
    if (description.length < 3 || description.length > 100)
      throw new Error('Expense: description must be 3..100 chars')
    if (input.amount.cents <= 0) throw new Error('Expense: amount must be > 0')
    const splitAmong = input.splitAmong ?? this.s.splitAmong
    if (new Set(splitAmong).size !== splitAmong.length)
      throw new Error('Expense: splitAmong must contain unique userIds')
    const purchaseLinks =
      input.purchaseLinks !== undefined
        ? validatePurchaseLinks(input.purchaseLinks)
        : this.s.purchaseLinks
    return new Expense({
      ...this.s,
      paidBy: input.paidBy,
      cents: input.amount.cents,
      description,
      purchaseId: input.purchaseId ?? this.s.purchaseId,
      date: input.date ? input.date.toISOString() : this.s.date,
      splitAmong,
      purchaseLinks,
    })
  }

  softDelete(input: { by: string }): Expense {
    return new Expense({
      ...this.s,
      deleted: true,
      deletedBy: input.by,
      deletedAt: new Date().toISOString(),
    })
  }

  recover(): Expense {
    return new Expense({
      ...this.s,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
  }

  get id(): string { return this.s.id }
  get paidBy(): string { return this.s.paidBy }
  get amount(): Money { return Money.fromCents(this.s.cents) }
  get deleted(): boolean { return this.s.deleted }
  get purchaseLinks(): { purchaseId: string; quantity: number }[] {
    return this.s.purchaseLinks.map((l) => ({ ...l }))
  }

  toSnapshot(): ExpenseSnapshot {
    return {
      ...this.s,
      splitAmong: [...this.s.splitAmong],
      purchaseLinks: this.s.purchaseLinks.map((l) => ({ ...l })),
    }
  }
}
