import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { Modal } from '@/presentation/components/common/Modal'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'
import type { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { reportError } from '@/shared/utils/reportError'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseSummary } from './ExpenseSummary'

const fmt = (cents: number): string => (cents / 100).toFixed(2)

export function ExpensesTab() {
  const { t } = useTranslation()
  const { event, setEvent } = useEventState()
  const container = useContainer()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ExpenseSnapshot | null>(null)
  const [deleting, setDeleting] = useState<ExpenseSnapshot | null>(null)
  if (!event) return null

  const visible = event.expenses.filter((e) => !e.deleted)
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  function confirmDelete() {
    if (!event || !me || !deleting) return
    const target = deleting
    guardedExecute(async () => {
      try {
        const handler = container.resolve<DeleteExpenseHandler>('deleteExpense')
        const result = await handler.execute({
          eventId: event.id,
          expenseId: target.id,
          deletedBy: me.id,
        })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
        setDeleting(null)
      } catch (err) {
        reportError('ExpensesTab', err)
      }
    })
  }

  return (
    <div className="space-y-4">
      {!adding && !editing && <Button onClick={() => setAdding(true)}>{t('expenses.add')}</Button>}
      {adding && <ExpenseForm onDone={() => setAdding(false)} />}
      {editing && <ExpenseForm expense={editing} onDone={() => setEditing(null)} />}
      {visible.length === 0 && (
        <p className="text-sm text-slate-400">{t('expenses.empty')}</p>
      )}
      <ul className="space-y-2">
        {visible.map((e) => (
          <li
            key={e.id}
            className={`rounded-lg border bg-slate-900 p-3 ${
              editing?.id === e.id ? 'border-violet-500 ring-1 ring-violet-500' : 'border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setEditing(e)}
                className="flex-1 rounded text-left hover:opacity-80"
                aria-label={t('expenses.edit')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">
                    {e.description} <span className="text-xs text-slate-500">✎</span>
                  </span>
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
              </button>
              <button
                type="button"
                onClick={() => setDeleting(e)}
                className="rounded p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                aria-label={t('expenses.delete')}
                title={t('expenses.delete')}
              >🗑️</button>
            </div>
          </li>
        ))}
      </ul>
      {visible.length > 0 && <ExpenseSummary />}
      {deleting && (
        <Modal open title={t('expenses.deleteTitle')} dismissable onClose={() => setDeleting(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              {t('expenses.deleteConfirm', { desc: deleting.description })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={confirmDelete}>
                {t('expenses.deleteYes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
