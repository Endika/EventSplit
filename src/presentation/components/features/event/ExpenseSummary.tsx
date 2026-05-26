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
    expenses: event.expenses.map((e) => ({
      paidBy: e.paidBy,
      amount: Money.fromCents(e.cents),
      splitAmong: e.splitAmong,
    })),
  })
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="text-sm text-slate-300">
        {t('expenses.summary.total')}: <strong className="text-slate-100">€{fmt(result.totalCents)}</strong> ·{' '}
        {t('expenses.summary.perPerson')}: <strong className="text-slate-100">€{fmt(result.perPersonCents)}</strong>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500">
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
              <tr key={b.userId} className={isMe ? 'bg-violet-900/30' : ''}>
                <td className="py-1">
                  {nameOf(b.userId)}
                  <YouLabel userId={b.userId} />
                </td>
                <td className="py-1">€{fmt(b.spentCents)}</td>
                <td
                  className={`py-1 ${
                    b.balanceCents > 0
                      ? 'text-teal-400'
                      : b.balanceCents < 0
                        ? 'text-rose-400'
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
          <p className="mb-1 text-xs font-medium uppercase text-slate-500">
            {t('expenses.summary.transfers')}
          </p>
          <ul className="space-y-1 text-sm">
            {result.transfers.map((tr, i) => (
              <li key={i} className="text-slate-200">
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
