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
  splitAmong: string[] // empty array means "all current participants"
  purchaseLinks: { purchaseId: string; quantity: number }[]
  deleted: boolean
  deletedBy: string | null
  deletedAt: string | null
}

export const DESCRIPTION_MIN = 3
export const DESCRIPTION_MAX = 100

interface ExpenseInput {
  paidBy: string
  amount: Money
  description: string
  purchaseId?: string | null
  date?: Date
  splitAmong?: string[]
  purchaseLinks?: { purchaseId: string; quantity: number }[]
}

function validateDescription(description: string): string {
  const trimmed = description.trim()
  if (trimmed.length < DESCRIPTION_MIN || trimmed.length > DESCRIPTION_MAX)
    throw new Error(`Expense: description must be ${DESCRIPTION_MIN}..${DESCRIPTION_MAX} chars`)
  return trimmed
}

function validateAmount(amount: Money): void {
  if (amount.cents <= 0) throw new Error('Expense: amount must be > 0')
}

function validateSplitAmong(splitAmong: string[]): string[] {
  if (new Set(splitAmong).size !== splitAmong.length)
    throw new Error('Expense: splitAmong must contain unique userIds')
  return splitAmong
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

export type LegacyExpenseSnapshot =
  | ExpenseSnapshot
  | Omit<ExpenseSnapshot, 'splitAmong' | 'purchaseLinks' | 'deleted' | 'deletedBy' | 'deletedAt'>

export function backfillExpenseSnapshot(s: LegacyExpenseSnapshot): ExpenseSnapshot {
  const full = s as ExpenseSnapshot
  return {
    ...full,
    splitAmong: full.splitAmong ?? [],
    purchaseLinks: full.purchaseLinks ?? [],
    deleted: full.deleted ?? false,
    deletedBy: full.deletedBy ?? null,
    deletedAt: full.deletedAt ?? null,
  }
}

export class Expense {
  readonly id: string
  readonly paidBy: string
  readonly deleted: boolean

  private constructor(private readonly s: ExpenseSnapshot) {
    this.id = s.id
    this.paidBy = s.paidBy
    this.deleted = s.deleted
  }

  static create(input: ExpenseInput): Expense {
    const description = validateDescription(input.description)
    validateAmount(input.amount)
    const splitAmong = validateSplitAmong(input.splitAmong ?? [])
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

  static restore(s: LegacyExpenseSnapshot): Expense {
    return new Expense(backfillExpenseSnapshot(s))
  }

  edit(input: ExpenseInput): Expense {
    const description = validateDescription(input.description)
    validateAmount(input.amount)
    const splitAmong = validateSplitAmong(input.splitAmong ?? this.s.splitAmong)
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

  get amount(): Money {
    return Money.fromCents(this.s.cents)
  }
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
