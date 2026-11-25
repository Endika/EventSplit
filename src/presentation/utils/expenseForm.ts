import type { UserKind } from '@/domain/entities/User'
import { payingUsers } from '@/domain/services/participantRoles'
import { userLabelOf, type Named } from '@/presentation/utils/userLabel'
import { parseDecimal } from '@/shared/utils/parseDecimal'
import { isPositiveNumber } from '@/presentation/utils/numbers'

type Participant = Named & { kind: UserKind }

/**
 * The people ticked in the split. Editing keeps the saved split (an empty one meant
 * "everyone"), minus any dog an older build saved into it; a new expense starts
 * with adults only, since children don't usually share costs.
 */
export function initialSplit(
  users: readonly Participant[],
  expense?: { splitAmong: readonly string[] },
): Set<string> {
  const payers = payingUsers(users)
  const allIds = payers.map((u) => u.id)
  if (expense) {
    const saved = expense.splitAmong.length > 0 ? expense.splitAmong : allIds
    return new Set(saved.filter((id) => allIds.includes(id)))
  }
  return new Set(payers.filter((u) => u.kind === 'adult').map((u) => u.id))
}

export function initialLinks(expense?: {
  purchaseLinks?: { purchaseId: string; quantity: number }[]
}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of expense?.purchaseLinks ?? []) out[l.purchaseId] = String(l.quantity)
  return out
}

/** A string that changes exactly when the form's editable content does. */
export function formSnapshot(form: {
  paidBy: string
  amount: string
  description: string
  splitAmong: ReadonlySet<string>
  links: Record<string, string>
}): string {
  return JSON.stringify({
    paidBy: form.paidBy,
    amount: form.amount,
    description: form.description,
    splitAmong: [...form.splitAmong].sort(),
    links: Object.entries(form.links).sort(),
  })
}

/** Settled users the expense would touch: the payer and everyone in the split. */
export function affectedClashIds(
  users: readonly { id: string }[],
  settledTransfers: readonly { from: string; to: string }[],
  paidBy: string,
  splitAmong: ReadonlySet<string>,
): string[] {
  const settled = new Set(settledTransfers.flatMap((s) => [s.from, s.to]))
  const allIds = users.map((u) => u.id)
  const splitIds = allIds.every((id) => splitAmong.has(id)) ? allIds : [...splitAmong]
  return [...new Set<string>([paidBy, ...splitIds])].filter((id) => settled.has(id))
}

export const clashNames = (users: readonly Named[], ids: readonly string[]): string =>
  ids.map((id) => userLabelOf(users, id)).join(', ')

/** Ticking an item links what is still missing, or one when nothing is. */
export function toggleLink(
  links: Record<string, string>,
  purchaseId: string,
  remaining: number,
): Record<string, string> {
  const next = { ...links }
  if (purchaseId in next) delete next[purchaseId]
  else next[purchaseId] = String(remaining > 0 ? remaining : 1)
  return next
}

export function purchaseLinksPayload(
  links: Record<string, string>,
): { purchaseId: string; quantity: number }[] {
  return Object.entries(links)
    .map(([purchaseId, q]) => ({ purchaseId, quantity: parseDecimal(q) }))
    .filter((l) => isPositiveNumber(l.quantity))
}

export function parseAmountEuros(amount: string): number | null {
  const euros = parseDecimal(amount)
  return isPositiveNumber(euros) ? euros : null
}
