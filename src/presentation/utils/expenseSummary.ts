import type { EventSnapshot } from '@/domain/entities/Event'
import { ExpenseSplitter } from '@/domain/services/ExpenseSplitter'
import { payingUsers } from '@/domain/services/participantRoles'
import { Money } from '@/domain/value-objects/Money'
import { live } from '@/presentation/utils/collections'
import { userName } from '@/presentation/utils/userLabel'

type Balance = ReturnType<typeof ExpenseSplitter.compute>['balances'][number]

/**
 * Everything the summary screen shows, derived from the event. Dogs attend but never
 * owe, and nobody settles up with a child: their balance is carried by the adult
 * answerable for them, so no transfer ever names a minor.
 */
export function buildExpenseSummary(event: EventSnapshot, meId: string | undefined) {
  const payers = payingUsers(event.users)
  const payerIds = payers.map((u) => u.id)
  const householdOf: Record<string, string> = Object.fromEntries(
    payers.flatMap((u) => (u.kind === 'adult' && u.household ? [[u.id, u.household]] : [])),
  )
  const liveExpenses = live(event.expenses)
  const result = ExpenseSplitter.compute({
    participantIds: payerIds,
    guardianOf: Object.fromEntries(
      payers.flatMap((u) => (u.guardianId ? [[u.id, u.guardianId]] : [])),
    ),
    householdOf,
    expenses: liveExpenses.map((e) => ({
      paidBy: e.paidBy,
      amount: Money.fromCents(e.cents),
      splitAmong: e.splitAmong,
    })),
  })

  const isSettled = (from: string, to: string): boolean =>
    event.settledTransfers.some((s) => s.from === from && s.to === to)
  const nameOf = (id: string) => userName(event.users, id)
  const householdMembers = (household: string) =>
    payers.filter((u) => householdOf[u.id] === household)
  // A transfer names the first member of a household, so that is who stands in
  // for the whole group.
  const householdRepresentedBy = (id: string): string | null => {
    const household = householdOf[id]
    // Stryker disable next-line OptionalChaining: a household in householdOf always has a member
    return household && householdMembers(household)[0]?.id === id ? household : null
  }
  const partyName = (id: string) => householdRepresentedBy(id) ?? nameOf(id)
  const householdSides = (tr: { from: string; to: string }): string[] =>
    [tr.from, tr.to].flatMap((id) => householdRepresentedBy(id) ?? [])

  // What a person ends up with includes the balance of the children they carry.
  const guardianIdOf = (userId: string) => event.users.find((u) => u.id === userId)?.guardianId
  const carriedFor = (payerId: string) =>
    result.balances
      .filter((b) => guardianIdOf(b.userId) === payerId)
      .reduce((n, b) => n + b.balanceCents, 0)
  const memberBalance = (id: string) =>
    (result.balances.find((b) => b.userId === id)?.balanceCents ?? 0) + carriedFor(id)
  const carriedNames = (payerId: string): string =>
    event.users
      .filter((u) => u.guardianId === payerId)
      .map((u) => u.name)
      .join(', ')
  const guardianNameOf = (userId: string): string => {
    const guardianId = guardianIdOf(userId)
    return guardianId ? nameOf(guardianId) : ''
  }

  const mine = result.balances.find((b) => b.userId === meId)
  const others = result.balances.filter((b) => b.userId !== mine?.userId)
  // Somebody who paid nothing and owes nothing only lengthens the list, unless
  // they carry a child's balance and so still show up in the transfers.
  const isZero = (b: Balance) =>
    b.spentCents === 0 && b.balanceCents === 0 && carriedFor(b.userId) === 0
  const shown = others.filter((b) => !isZero(b))

  // An empty splitAmong means everyone who pays, resolved the way the splitter does.
  const myExpenses =
    // Stryker disable next-line ConditionalExpression: no payer id is undefined, so the filter alone yields []
    meId === undefined
      ? []
      : liveExpenses.filter((e) => {
          const split = e.splitAmong.filter((id) => payerIds.includes(id))
          return (split.length > 0 ? split : payerIds).includes(meId)
        })

  return {
    result,
    mine,
    myCarried: mine ? memberBalance(mine.userId) : 0,
    shown,
    hiddenCount: others.length - shown.length,
    allSquare:
      result.transfers.length > 0 && result.transfers.every((tr) => isSettled(tr.from, tr.to)),
    myExpenses,
    householdOf,
    isSettled,
    nameOf,
    partyName,
    householdMembers,
    householdRepresentedBy,
    householdSides,
    memberBalance,
    carriedNames,
    guardianNameOf,
  }
}
