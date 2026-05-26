import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { Button } from '@/presentation/components/common/Button'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseSummary } from './ExpenseSummary'

const fmt = (cents: number): string => (cents / 100).toFixed(2)

export function ExpensesTab() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const [adding, setAdding] = useState(false)
  if (!event) return null

  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="space-y-4">
      {!adding && <Button onClick={() => setAdding(true)}>{t('expenses.add')}</Button>}
      {adding && <ExpenseForm onDone={() => setAdding(false)} />}
      {event.expenses.length === 0 && (
        <p className="text-sm text-slate-400">{t('expenses.empty')}</p>
      )}
      <ul className="space-y-2">
        {event.expenses.map((e) => (
          <li key={e.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-100">{e.description}</span>
              <span className="text-sm text-slate-200">€{fmt(e.cents)}</span>
            </div>
            <div className="text-xs text-slate-500">
              {t('expenses.paidBy', { name: nameOf(e.paidBy) })}
              <YouLabel userId={e.paidBy} />
            </div>
            {e.splitAmong.length > 0 && e.splitAmong.length < event.users.length && (
              <div className="mt-1 text-xs text-slate-500">
                {t('expenses.splitBetween', {
                  list: e.splitAmong.map(nameOf).join(', '),
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
      {event.expenses.length > 0 && <ExpenseSummary />}
    </div>
  )
}
