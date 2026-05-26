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
import type { RecoverExpenseHandler } from '@/application/handlers/RecoverExpenseHandler'
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
  const [showDeleted, setShowDeleted] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<ExpenseSnapshot | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  if (!event) return null

  function requestEdit(e: ExpenseSnapshot) {
    // If a form is open with unsaved changes for a DIFFERENT item, confirm first.
    if ((editing || adding) && formDirty && editing?.id !== e.id) {
      setPendingEdit(e)
      return
    }
    setAdding(false)
    setEditing(e)
  }

  const visible = event.expenses.filter((e) => !e.deleted)
  const deleted = event.expenses.filter((e) => e.deleted)
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  function recover(e: ExpenseSnapshot) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<RecoverExpenseHandler>('recoverExpense')
        const result = await handler.execute({ eventId: event.id, expenseId: e.id, recoveredBy: me.id })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('ExpensesTab', err)
      }
    })
  }

  function confirmDelete() {
    if (!event || !me || !deleting) return
    const target = deleting
    guardedExecute(async () => {
      setDeleteBusy(true)
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
      } finally {
        setDeleteBusy(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      {!adding && !editing && <Button onClick={() => setAdding(true)}>{t('expenses.add')}</Button>}
      {adding && <ExpenseForm key="new" onDone={() => { setAdding(false); setFormDirty(false) }} onDirtyChange={setFormDirty} />}
      {editing && (
        <ExpenseForm
          key={editing.id}
          expense={editing}
          onDone={() => { setEditing(null); setFormDirty(false) }}
          onDirtyChange={setFormDirty}
        />
      )}
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
                onClick={() => requestEdit(e)}
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
      {deleted.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            {showDeleted ? '▾' : '▸'} {t('expenses.showDeleted', { count: deleted.length })}
          </button>
          {showDeleted && (
            <ul className="mt-2 space-y-2">
              {deleted.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm">
                  <span className="text-slate-500 line-through">{e.description}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-500 line-through">€{fmt(e.cents)}</span>
                    <button
                      type="button"
                      onClick={() => recover(e)}
                      className="rounded px-2 py-1 text-xs text-teal-300 hover:bg-slate-800"
                    >
                      ↺ {t('expenses.restore')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {pendingEdit && (
        <Modal open title={t('common.unsavedTitle')} dismissable onClose={() => setPendingEdit(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">{t('common.unsavedBody')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setPendingEdit(null)}>
                {t('common.keepEditing')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const target = pendingEdit
                  setPendingEdit(null)
                  setFormDirty(false)
                  setAdding(false)
                  setEditing(target)
                }}
              >
                {t('common.discard')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
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
              <Button type="button" onClick={confirmDelete} loading={deleteBusy}>
                {t('expenses.deleteYes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
