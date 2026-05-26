import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { ExpenseSplitter } from '@/domain/services/ExpenseSplitter'
import { Money } from '@/domain/value-objects/Money'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import type { ToggleSettlementHandler } from '@/application/handlers/ToggleSettlementHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { reportError } from '@/shared/utils/reportError'

const fmt = (cents: number): string => (cents / 100).toFixed(2)

export function ExpenseSummary() {
  const { t } = useTranslation()
  const { event, setEvent } = useEventState()
  const container = useContainer()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  if (!event) return null

  function isSettled(from: string, to: string): boolean {
    return event!.settledTransfers.some((s) => s.from === from && s.to === to)
  }

  function toggleSettled(from: string, to: string) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<ToggleSettlementHandler>('toggleSettlement')
        const result = await handler.execute({ eventId: event.id, userId: me.id, from, to })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('ExpenseSummary', err)
      }
    })
  }

  const result = ExpenseSplitter.compute({
    participantIds: event.users.map((u) => u.id),
    expenses: event.expenses.filter((e) => !e.deleted).map((e) => ({
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
            {result.transfers.map((tr, i) => {
              const settled = isSettled(tr.from, tr.to)
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settled}
                    onChange={() => toggleSettled(tr.from, tr.to)}
                    className="size-4 rounded border-slate-600 bg-slate-800 accent-teal-500"
                    aria-label={t('expenses.summary.markPaid')}
                  />
                  <span className={settled ? 'text-slate-500 line-through' : 'text-slate-200'}>
                    {t('expenses.summary.transferLine', {
                      from: nameOf(tr.from),
                      euros: fmt(tr.cents),
                      to: nameOf(tr.to),
                    })}
                  </span>
                  {settled && (
                    <span className="rounded-full bg-teal-900/50 px-2 py-0.5 text-xs text-teal-300">
                      {t('expenses.summary.paid')}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
