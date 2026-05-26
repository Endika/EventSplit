import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import type { EditExpenseHandler } from '@/application/handlers/EditExpenseHandler'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { Modal } from '@/presentation/components/common/Modal'
import { useOnlineStatus } from '@/presentation/context/SyncContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { reportError } from '@/shared/utils/reportError'
import { parseDecimal } from '@/shared/utils/parseDecimal'
import { displayUnit } from '@/presentation/utils/units'

export function ExpenseForm({
  onDone,
  expense,
  onDirtyChange,
}: {
  onDone: () => void
  expense?: ExpenseSnapshot
  onDirtyChange?: (dirty: boolean) => void
}) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const online = useOnlineStatus()
  const { guardedExecute } = useWriteGuard()
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? me?.id ?? '')
  const [amount, setAmount] = useState(expense ? (expense.cents / 100).toString() : '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [splitAmong, setSplitAmong] = useState<Set<string>>(() => {
    const allIds = event?.users.map((u) => u.id) ?? []
    if (expense) {
      // Editing: preserve the saved split (empty array meant "everyone").
      return new Set(expense.splitAmong.length > 0 ? expense.splitAmong : allIds)
    }
    // New expense: default to adults only — children don't usually share costs.
    return new Set((event?.users ?? []).filter((u) => u.kind === 'adult').map((u) => u.id))
  })
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [links, setLinks] = useState<Record<string, string>>(() => {
    if (expense) {
      const out: Record<string, string> = {}
      for (const l of expense.purchaseLinks ?? []) out[l.purchaseId] = String(l.quantity)
      return out
    }
    return {}
  })

  const rootRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const currentSnapshot = JSON.stringify({
    paidBy,
    amount,
    description,
    splitAmong: [...splitAmong].sort(),
    links: Object.entries(links).sort(),
  })
  const [initialSnapshot] = useState(currentSnapshot)
  const isDirty = initialSnapshot !== currentSnapshot

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  if (!event) return null

  function boughtByOthers(purchaseId: string): number {
    return event!.expenses
      .filter((e) => !e.deleted && e.id !== expense?.id)
      .reduce(
        (s, e) => s + ((e.purchaseLinks ?? []).find((l) => l.purchaseId === purchaseId)?.quantity ?? 0),
        0,
      )
  }

  const listItems = expense
    ? event.purchases.filter((p) => !p.deleted && p.kind !== 'bring')
    : event.purchases.filter(
        (p) => !p.deleted && p.kind !== 'bring' && boughtByOthers(p.id) < p.totalQuantity,
      )

  function toggleSplit(id: string) {
    setSplitAmong((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSplitAmong(new Set(event?.users.map((u) => u.id) ?? []))
  }

  function selectNone() {
    setSplitAmong(new Set())
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!event || !me) return
    const amountEuros = parseDecimal(amount)
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setError(t('expenses.form.invalidAmount'))
      return
    }
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const allUserIds = event.users.map((u) => u.id)
        const split = splitAmong.size === allUserIds.length ? [] : [...splitAmong]
        const purchaseLinks = Object.entries(links)
          .map(([purchaseId, q]) => ({ purchaseId, quantity: parseDecimal(q) }))
          .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0)
        let result
        if (expense) {
          const handler = container.resolve<EditExpenseHandler>('editExpense')
          result = await handler.execute({
            eventId: event.id,
            expenseId: expense.id,
            editedBy: me.id,
            paidBy,
            amountEuros,
            description,
            splitAmong: split,
            purchaseLinks,
          })
        } else {
          const handler = container.resolve<AddExpenseHandler>('addExpense')
          result = await handler.execute({
            eventId: event.id,
            paidBy,
            amountEuros,
            description,
            splitAmong: split,
            purchaseLinks,
          })
        }
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
        onDone()
      } catch (err) {
        reportError('ExpenseForm', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <>
      {confirmCancel && (
        <Modal open title={t('common.unsavedTitle')} dismissable onClose={() => setConfirmCancel(false)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">{t('common.unsavedBody')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmCancel(false)}>
                {t('common.keepEditing')}
              </Button>
              <Button type="button" onClick={() => { setConfirmCancel(false); onDone() }}>
                {t('common.discard')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <form ref={rootRef} onSubmit={submit} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <label className="block text-sm text-slate-300">
        {t('expenses.form.paidBy')}
        <select
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
          required
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          <option value="" disabled>—</option>
          {event.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.alias ? `${u.name} (${u.alias})` : u.name}
            </option>
          ))}
        </select>
      </label>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={t('expenses.form.amount')}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <Input
        placeholder={t('expenses.form.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        minLength={3}
        maxLength={100}
      />
      <fieldset className="rounded-lg border border-slate-800 p-3">
        <legend className="px-2 text-xs uppercase tracking-wide text-slate-500">
          {t('expenses.form.splitBetween')}
        </legend>
        <div className="mb-2 flex gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            {t('expenses.form.selectAll')}
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            {t('expenses.form.selectNone')}
          </button>
        </div>
        <ul className="space-y-1">
          {event.users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={splitAmong.has(u.id)}
                onChange={() => toggleSplit(u.id)}
                disabled={busy}
                className="size-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
              />
              <span className="text-slate-200">
                {u.alias ? `${u.name} (${u.alias})` : u.name}
              </span>
            </li>
          ))}
        </ul>
      </fieldset>
      {listItems.length > 0 && (
        <fieldset className="rounded-lg border border-slate-800 p-3">
          <legend className="px-2 text-xs uppercase tracking-wide text-slate-500">
            {t('expenses.form.markBought')}
          </legend>
          <ul className="space-y-2">
            {listItems.map((p) => {
              const checked = p.id in links
              const remaining = Math.max(1, p.totalQuantity - boughtByOthers(p.id))
              const unit = displayUnit(p.unit, t)
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setLinks((prev) => {
                          const next = { ...prev }
                          if (p.id in next) delete next[p.id]
                          else next[p.id] = String(remaining)
                          return next
                        })
                      }
                      className="size-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                    />
                    <span className="text-slate-200">
                      {p.item}{' '}
                      <span className="text-slate-500">
                        — {Math.round(p.totalQuantity * 100) / 100} {unit}
                      </span>
                    </span>
                  </label>
                  {checked && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={links[p.id] ?? ''}
                        onChange={(e) =>
                          setLinks((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <span className="text-xs text-slate-500">
                        {t('expenses.form.remainingHint', {
                          n: Math.round(remaining * 100) / 100,
                          total: Math.round(p.totalQuantity * 100) / 100,
                          unit,
                        })}
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => (isDirty ? setConfirmCancel(true) : onDone())}
          disabled={busy}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={busy} disabled={busy || !online || !paidBy || !amount}>
          {expense ? t('expenses.form.update') : t('expenses.form.submit')}
        </Button>
      </div>
      </form>
    </>
  )
}
