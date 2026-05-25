import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { ExpenseSplitter } from '@/domain/services/ExpenseSplitter'
import { Money } from '@/domain/value-objects/Money'
import { YouLabel } from '@/presentation/components/common/YouLabel'

const fmt = (cents: number): string => (cents / 100).toFixed(2)

export function ExpenseSummary() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const me = useCurrentUser()
  if (!event) return null

  const result = ExpenseSplitter.compute({
    participantIds: event.users.map((u) => u.id),
    expenses: event.expenses.map((e) => ({ paidBy: e.paidBy, amount: Money.fromCents(e.cents) })),
  })
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="text-sm text-gray-600">
        {t('expenses.summary.total')}: <strong>€{fmt(result.totalCents)}</strong> ·{' '}
        {t('expenses.summary.perPerson')}: <strong>€{fmt(result.perPersonCents)}</strong>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="py-1">{t('expenses.summary.person')}</th>
            <th className="py-1">{t('expenses.summary.spent')}</th>
            <th className="py-1">{t('expenses.summary.balance')}</th>
          </tr>
        </thead>
        <tbody>
          {result.balances.map((b) => {
            const isMe = me?.id === b.userId
            return (
              <tr key={b.userId} className={isMe ? 'bg-amber-50' : ''}>
                <td className="py-1">
                  {nameOf(b.userId)}
                  <YouLabel userId={b.userId} />
                </td>
                <td className="py-1">€{fmt(b.spentCents)}</td>
                <td
                  className={`py-1 ${
                    b.balanceCents > 0
                      ? 'text-green-600'
                      : b.balanceCents < 0
                        ? 'text-red-600'
                        : ''
                  }`}
                >
                  {b.balanceCents > 0 ? '+' : ''}€{fmt(b.balanceCents)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {result.transfers.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-gray-500">
            {t('expenses.summary.transfers')}
          </p>
          <ul className="space-y-1 text-sm">
            {result.transfers.map((tr, i) => (
              <li key={i}>
                {t('expenses.summary.transferLine', {
                  from: nameOf(tr.from),
                  euros: fmt(tr.cents),
                  to: nameOf(tr.to),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
