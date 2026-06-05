import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import type { EditExpenseHandler } from '@/application/handlers/EditExpenseHandler'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { Modal } from '@/presentation/components/common/Modal'
import { useOnlineStatus } from '@/presentation/context/SyncContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { reportError } from '@/shared/utils/reportError'
import { parseDecimal } from '@/shared/utils/parseDecimal'
import { displayUnit } from '@/presentation/utils/units'
import { friendlyError } from '@/presentation/utils/friendlyError'
import { groupPurchases } from '@/presentation/utils/groupPurchases'
import { isPurchaseDone, remainingToBuy } from '@/presentation/utils/purchaseProgress'

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
  const [confirmSettled, setConfirmSettled] = useState(false)
  const [onlyMine, setOnlyMine] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
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

  const settledUserIds = new Set(event.settledTransfers.flatMap((s) => [s.from, s.to]))

  function affectedClashIds(): string[] {
    const allIds = event!.users.map((u) => u.id)
    const splitIds = allIds.every((id) => splitAmong.has(id)) ? allIds : [...splitAmong]
    const affected = new Set<string>([paidBy, ...splitIds])
    return [...affected].filter((id) => settledUserIds.has(id))
  }

  // Show every buyable item. Items already fully bought by other expenses are not hidden:
  // they render crossed-off as "Comprado" so you can still see — and over-buy — them.
  const listItems = event.purchases.filter((p) => !p.deleted && p.kind !== 'bring')

  // Purely visual filter: hide items not assigned to me. Never touches `links`,
  // so an item checked before toggling stays linked and still gets saved.
  const visibleItems = onlyMine ? listItems.filter((p) => p.assignedTo === me?.id) : listItems

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

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Stable collapse key for a subgroup. NUL can't occur in trimmed user input.
  const subCollapseKey = (group: string, subgroup: string) => `${group}\u0000${subgroup}`

  const renderListItem = (p: PurchaseSnapshot) => {
    const checked = p.id in links
    const remaining = remainingToBuy(event!, p, { excludeExpenseId: expense?.id })
    const done = isPurchaseDone(event!, p, { excludeExpenseId: expense?.id })
    const unit = displayUnit(p.unit, t, p.totalQuantity)
    const assignee = p.assignedTo ? (event!.users.find((u) => u.id === p.assignedTo) ?? null) : null
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
                else next[p.id] = String(remaining > 0 ? remaining : 1)
                return next
              })
            }
            className="size-4 rounded border-border bg-elevated accent-brand"
          />
          <span className={done ? 'text-muted line-through' : 'text-ink'}>
            {p.item}{' '}
            <span className="text-muted">
              — {Math.round(p.totalQuantity * 100) / 100} {unit}
            </span>
            {assignee && (
              <span
                className="ml-1 whitespace-nowrap text-xs text-brand"
                title={t('purchases.form.assignedTo')}
              >
                🛒 {assignee.alias ? `${assignee.name} (${assignee.alias})` : assignee.name}
              </span>
            )}
          </span>
          {done && (
            <span className="ml-1 whitespace-nowrap text-xs text-muted">
              ✅ {t('purchases.bought')}
            </span>
          )}
        </label>
        {checked && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={links[p.id] ?? ''}
              onChange={(e) => setLinks((prev) => ({ ...prev, [p.id]: e.target.value }))}
              className="w-20 rounded-xl border border-border bg-surface px-2 py-1 text-base text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
            />
            <span className="text-xs text-muted">
              {remaining > 0
                ? t('expenses.form.remainingHint', {
                    n: Math.round(remaining * 100) / 100,
                    total: Math.round(p.totalQuantity * 100) / 100,
                    unit,
                  })
                : t('purchases.bought')}
            </span>
          </div>
        )}
      </li>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!event || !me) return
    const amountEuros = parseDecimal(amount)
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setError(t('expenses.form.invalidAmount'))
      return
    }
    if (affectedClashIds().length > 0 && !confirmSettled) {
      setConfirmSettled(true)
      return
    }
    setConfirmSettled(false)
    doWrite(amountEuros)
  }

  function doWrite(amountEuros: number) {
    if (!event || !me) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const allUserIds = event.users.map((u) => u.id)
        // Store [] ("everyone") only if every CURRENT user is selected — recompute
        // against live users so a realtime join/leave can't silently mis-scope it.
        const split = allUserIds.every((id) => splitAmong.has(id)) ? [] : [...splitAmong]
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
            createdBy: me.id,
            amountEuros,
            description,
            splitAmong: split,
            purchaseLinks,
          })
        }
        setEvent(result.event, result.version)
        onDone()
      } catch (err) {
        reportError('ExpenseForm', err)
        setError(friendlyError(err, t))
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <>
      {confirmCancel && (
        <Modal
          open
          title={t('common.unsavedTitle')}
          dismissable
          onClose={() => setConfirmCancel(false)}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('common.unsavedBody')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmCancel(false)}>
                {t('common.keepEditing')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmCancel(false)
                  onDone()
                }}
              >
                {t('common.discard')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {confirmSettled && (
        <Modal
          open
          title={t('expenses.settledWarnTitle')}
          dismissable
          onClose={() => setConfirmSettled(false)}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {t('expenses.settledWarnBody', {
                names: affectedClashIds()
                  .map((id) => {
                    const u = event!.users.find((x) => x.id === id)
                    return u ? (u.alias ? `${u.name} (${u.alias})` : u.name) : '?'
                  })
                  .join(', '),
              })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmSettled(false)}>
                {t('expenses.settledWarnCancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmSettled(false)
                  doWrite(parseDecimal(amount))
                }}
              >
                {t('expenses.settledWarnContinue')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <form
        ref={rootRef}
        onSubmit={submit}
        className="space-y-3 rounded-xl border border-border bg-surface p-4"
      >
        <label className="block text-sm text-muted">
          {t('expenses.form.paidBy')}
          <select
            className="mt-1 block w-full rounded-xl border border-border bg-surface p-2 text-base text-ink sm:text-sm"
            required
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            <option value="" disabled>
              —
            </option>
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
        <fieldset className="rounded-xl border border-border p-3">
          <legend className="px-2 text-xs uppercase tracking-wide text-muted">
            {t('expenses.form.splitBetween')}
          </legend>
          <div className="mb-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="rounded px-2 py-1 text-muted hover:bg-elevated hover:text-ink"
            >
              {t('expenses.form.selectAll')}
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="rounded px-2 py-1 text-muted hover:bg-elevated hover:text-ink"
            >
              {t('expenses.form.selectNone')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {event.users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleSplit(u.id)}
                disabled={busy}
                className={`rounded-full px-3 py-1 text-xs ${
                  splitAmong.has(u.id) ? 'bg-brand text-white' : 'bg-elevated text-muted'
                }`}
              >
                {u.alias ? `${u.name} (${u.alias})` : u.name}
              </button>
            ))}
          </div>
        </fieldset>
        {listItems.length > 0 && (
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-2 text-xs uppercase tracking-wide text-muted">
              {t('expenses.form.markBought')}
            </legend>
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={() => setOnlyMine((v) => !v)}
                className="size-4 rounded border-border bg-elevated accent-brand"
              />
              {t('common.onlyMine')}
            </label>
            <div className="space-y-3">
              {groupPurchases(event, visibleItems).map(({ group, items, subgroups }) => (
                <div key={group || '__none__'} className="space-y-2">
                  {group !== '' && (
                    <button
                      type="button"
                      onClick={() => toggleCollapse(group)}
                      className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-brand hover:bg-elevated/50"
                      aria-label={t('purchases.toggleGroup')}
                    >
                      <span className="text-sm text-muted">{collapsed.has(group) ? '▸' : '▾'}</span>
                      {group} <span className="text-muted">({items.length})</span>
                    </button>
                  )}
                  {!collapsed.has(group) && (
                    <div className="space-y-2">
                      {subgroups.map(({ subgroup, items: subItems }) =>
                        subgroup === '' ? (
                          <ul key="__nosub__" className="space-y-2">
                            {subItems.map(renderListItem)}
                          </ul>
                        ) : (
                          <div key={subgroup} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleCollapse(subCollapseKey(group, subgroup))}
                              className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-brand hover:bg-elevated/50"
                              aria-label={t('purchases.toggleSubgroup')}
                            >
                              <span className="text-xs text-muted">
                                {collapsed.has(subCollapseKey(group, subgroup)) ? '▸' : '▾'}
                              </span>
                              {subgroup} <span className="text-muted">({subItems.length})</span>
                            </button>
                            {!collapsed.has(subCollapseKey(group, subgroup)) && (
                              <ul className="space-y-2 pl-4">{subItems.map(renderListItem)}</ul>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex gap-2 rounded-b-xl border-t border-border bg-surface px-4 py-3">
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
