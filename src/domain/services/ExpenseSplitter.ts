import { Money } from '@/domain/value-objects/Money'

export interface SplitterInput {
  participantIds: string[]
  expenses: {
    paidBy: string
    amount: Money
    splitAmong?: string[] | null
  }[]
}

export interface UserBalance {
  userId: string
  spentCents: number
  balanceCents: number
}

export interface Transfer {
  from: string
  to: string
  cents: number
}

export interface SplitterResult {
  totalCents: number
  balances: UserBalance[]
  transfers: Transfer[]
}

export const ExpenseSplitter = {
  compute(input: SplitterInput): SplitterResult {
    const n = input.participantIds.length
    if (n === 0) return { totalCents: 0, balances: [], transfers: [] }

    const spent = new Map<string, number>(input.participantIds.map((id) => [id, 0]))
    const owed = new Map<string, number>(input.participantIds.map((id) => [id, 0]))
    let totalCents = 0

    for (const e of input.expenses) {
      spent.set(e.paidBy, (spent.get(e.paidBy) ?? 0) + e.amount.cents)
      totalCents += e.amount.cents

      // Determine the actual split list for this expense
      const requestedSplit = (e.splitAmong ?? []).filter((id) =>
        input.participantIds.includes(id),
      )
      const splitList = requestedSplit.length > 0 ? requestedSplit : input.participantIds

      const k = splitList.length
      // Cent-perfect split: floor + distribute remainder
      const base = Math.floor(e.amount.cents / k)
      const remainder = e.amount.cents - base * k
      for (let i = 0; i < splitList.length; i++) {
        const userId = splitList[i]!
        const share = base + (i < remainder ? 1 : 0)
        owed.set(userId, (owed.get(userId) ?? 0) + share)
      }
    }

    const balances: UserBalance[] = input.participantIds.map((id) => ({
      userId: id,
      spentCents: spent.get(id) ?? 0,
      balanceCents: (spent.get(id) ?? 0) - (owed.get(id) ?? 0),
    }))

    // Greedy settlement: largest debtor pays largest creditor
    const debtors = balances
      .filter((b) => b.balanceCents < 0)
      .map((b) => ({ id: b.userId, owe: -b.balanceCents }))
      .sort((a, b) => b.owe - a.owe)
    const creditors = balances
      .filter((b) => b.balanceCents > 0)
      .map((b) => ({ id: b.userId, get: b.balanceCents }))
      .sort((a, b) => b.get - a.get)

    const transfers: Transfer[] = []
    let i = 0
    let j = 0
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i]!
      const c = creditors[j]!
      const amount = Math.min(d.owe, c.get)
      if (amount > 0) transfers.push({ from: d.id, to: c.id, cents: amount })
      d.owe -= amount
      c.get -= amount
      if (d.owe === 0) i++
      if (c.get === 0) j++
    }

    return { totalCents, balances, transfers }
  },
}
