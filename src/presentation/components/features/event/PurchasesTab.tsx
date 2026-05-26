import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { Modal } from '@/presentation/components/common/Modal'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { AssignPurchaseHandler } from '@/application/handlers/AssignPurchaseHandler'
import type { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import type { RecoverPurchaseHandler } from '@/application/handlers/RecoverPurchaseHandler'
import type { RenameGroupHandler } from '@/application/handlers/RenameGroupHandler'
import type { SetGroupOrderHandler } from '@/application/handlers/SetGroupOrderHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { reportError } from '@/shared/utils/reportError'
import { PurchaseForm } from './PurchaseForm'

const KNOWN_UNITS = ['units', 'bottles', 'cans', 'kg', 'liters', 'single']
function displayUnit(unit: string, t: (k: string) => string): string {
  return KNOWN_UNITS.includes(unit) ? t(`purchases.form.units.${unit}`) : unit
}

export function PurchasesTab() {
  const { t } = useTranslation()
  const { event, setEvent } = useEventState()
  const container = useContainer()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PurchaseSnapshot | null>(null)
  const [deleting, setDeleting] = useState<PurchaseSnapshot | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<PurchaseSnapshot | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [groupNewName, setGroupNewName] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  if (!event) return null

  function toggleCollapse(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  function requestEdit(p: PurchaseSnapshot) {
    // If a form is open with unsaved changes for a DIFFERENT item, confirm first.
    if ((editing || adding) && formDirty && editing?.id !== p.id) {
      setPendingEdit(p)
      return
    }
    setAdding(false)
    setEditing(p)
  }

  const visible = event.purchases.filter((p) => !p.deleted)
  const deleted = event.purchases.filter((p) => p.deleted)
  const userName = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'
  const round2 = (n: number) => Math.round(n * 100) / 100
  const linkedExpenses = (pid: string) =>
    event.expenses.filter(
      (e) => !e.deleted && (e.purchaseLinks ?? []).some((l) => l.purchaseId === pid),
    )
  const boughtQty = (pid: string) =>
    event.expenses
      .filter((e) => !e.deleted)
      .reduce(
        (s, e) => s + ((e.purchaseLinks ?? []).find((l) => l.purchaseId === pid)?.quantity ?? 0),
        0,
      )

  const grouped = (() => {
    const map = new Map<string, PurchaseSnapshot[]>()
    for (const p of visible) {
      const key = p.group ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    // ordered groups first, then unordered alphabetically, ungrouped ('') last
    const order = event.groupOrder ?? []
    const keys = [...map.keys()].sort((a, b) => {
      if (a === '') return 1
      if (b === '') return -1
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
    return keys.map((k) => ({ group: k, items: map.get(k)! }))
  })()

  function assignBuyer(p: PurchaseSnapshot, assignedTo: string | null) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<AssignPurchaseHandler>('assignPurchase')
        const result = await handler.execute({
          eventId: event.id, purchaseId: p.id, editedBy: me.id,
          assignedTo, purchased: p.purchased,
        })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function assignBringer(p: PurchaseSnapshot, assignedTo: string | null) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<AssignPurchaseHandler>('assignPurchase')
        const result = await handler.execute({
          eventId: event.id, purchaseId: p.id, editedBy: me.id,
          assignedTo, purchased: false,
        })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function toggleBought(p: PurchaseSnapshot, purchased: boolean) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<AssignPurchaseHandler>('assignPurchase')
        const result = await handler.execute({
          eventId: event.id, purchaseId: p.id, editedBy: me.id,
          assignedTo: p.assignedTo ?? null, purchased,
        })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function askDelete(p: PurchaseSnapshot) {
    setDeleting(p)
  }

  function recover(p: PurchaseSnapshot) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<RecoverPurchaseHandler>('recoverPurchase')
        const result = await handler.execute({ eventId: event.id, purchaseId: p.id, recoveredBy: me.id })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function confirmDelete() {
    if (!event || !me || !deleting) return
    const target = deleting
    guardedExecute(async () => {
      try {
        const handler = container.resolve<DeletePurchaseHandler>('deletePurchase')
        const result = await handler.execute({
          eventId: event.id, purchaseId: target.id, deletedBy: me.id,
        })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
        setDeleting(null)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function moveGroup(group: string, dir: -1 | 1) {
    if (!event || !me) return
    // build the ordered list of real group names (current visual order minus ungrouped)
    const realGroups = grouped.map((g) => g.group).filter((g) => g !== '')
    const idx = realGroups.indexOf(group)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= realGroups.length) return
    const next = [...realGroups]
    ;[next[idx], next[target]] = [next[target]!, next[idx]!]
    guardedExecute(async () => {
      try {
        const handler = container.resolve<SetGroupOrderHandler>('setGroupOrder')
        const result = await handler.execute({ eventId: event.id, userId: me.id, order: next })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function submitRename() {
    if (!event || !me || renamingGroup === null) return
    const from = renamingGroup
    const to = groupNewName
    guardedExecute(async () => {
      try {
        const handler = container.resolve<RenameGroupHandler>('renameGroup')
        const result = await handler.execute({ eventId: event.id, userId: me.id, from, to })
        container.resolve<LocalStorageCache>('cache').set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
        setRenamingGroup(null)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  return (
    <div className="space-y-3">
      {!adding && !editing && <Button onClick={() => setAdding(true)}>{t('purchases.add')}</Button>}
      {adding && <PurchaseForm key="new" onDone={() => { setAdding(false); setFormDirty(false) }} onDirtyChange={setFormDirty} />}
      {editing && (
        <PurchaseForm
          key={editing.id}
          purchase={editing}
          onDone={() => { setEditing(null); setFormDirty(false) }}
          onDirtyChange={setFormDirty}
        />
      )}
      {visible.length === 0 && <p className="text-sm text-slate-400">{t('purchases.empty')}</p>}
      {grouped.map(({ group, items }) => (
        <div key={group || '__none__'} className="space-y-2">
          {group !== '' && (
            <div className="flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => toggleCollapse(group)}
                className="flex flex-1 items-center gap-1.5 rounded-lg py-2 text-left text-xs font-semibold uppercase tracking-wide text-violet-300 hover:bg-slate-800/50"
                aria-label={t('purchases.toggleGroup')}
              >
                <span className="text-sm text-slate-500">{collapsed.has(group) ? '▸' : '▾'}</span>
                {group} <span className="text-slate-500">({items.length})</span>
              </button>
              <button type="button" onClick={() => moveGroup(group, -1)} className="flex size-9 items-center justify-center rounded-lg text-base text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label={t('purchases.moveUp')}>↑</button>
              <button type="button" onClick={() => moveGroup(group, 1)} className="flex size-9 items-center justify-center rounded-lg text-base text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label={t('purchases.moveDown')}>↓</button>
              <button type="button" onClick={() => { setRenamingGroup(group); setGroupNewName(group) }} className="flex size-9 items-center justify-center rounded-lg text-base text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label={t('purchases.renameGroup')}>✎</button>
            </div>
          )}
          {group === '' && grouped.length > 1 && (
            <button
              type="button"
              onClick={() => toggleCollapse(group)}
              className="flex w-full items-center gap-1.5 rounded-lg px-1 py-2 text-left text-xs font-semibold uppercase tracking-wide text-violet-300 hover:bg-slate-800/50"
              aria-label={t('purchases.toggleGroup')}
            >
              <span className="text-sm text-slate-500">{collapsed.has(group) ? '▸' : '▾'}</span>
              {t('purchases.noGroup')} <span className="text-slate-500">({items.length})</span>
            </button>
          )}
          {!collapsed.has(group) && (
          <ul className="space-y-2">
            {items.map((p) => {
              const hasLinks = p.kind !== 'bring' && linkedExpenses(p.id).length > 0
              const bought = hasLinks ? boughtQty(p.id) : 0
              const total = p.totalQuantity
              const done = hasLinks && bought >= total
              const struck = done || p.purchased
              const buyerNames = hasLinks
                ? [...new Set(linkedExpenses(p.id).map((e) => e.paidBy))]
                    .map((id) => userName(id))
                    .join(', ')
                : ''
              return (
              <li
                key={p.id}
                className={`rounded-lg border bg-slate-900 p-3 ${
                  editing?.id === p.id ? 'border-violet-500 ring-1 ring-violet-500' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => requestEdit(p)}
                className="flex-1 rounded text-left hover:opacity-80"
                aria-label={t('purchases.edit')}
              >
                <div className={`font-medium ${struck ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                  {p.kind === 'bring' && <span title={t('purchases.form.modeBring')}>🏠 </span>}{p.item} <span className="text-xs text-slate-500">✎</span>
                </div>
                <div className="text-sm text-slate-400">
                  {t(p.kind === 'bring' ? 'purchases.totalToBring' : 'purchases.totalQuantity', { n: Math.round(p.totalQuantity * 100) / 100, unit: displayUnit(p.unit, t) })}
                </div>
                <div className="text-xs text-slate-500">
                  {t('purchases.createdBy', { name: userName(p.createdBy) })}
                  <YouLabel userId={p.createdBy} />
                </div>
              </button>
              <button
                type="button"
                onClick={() => askDelete(p)}
                className="rounded p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                aria-label={t('purchases.delete')}
                title={t('purchases.delete')}
              >🗑️</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs">
              {p.kind === 'bring' ? (
                <label className="ml-auto flex items-center gap-1 text-slate-400">
                  {t('purchases.broughtByShort')}
                  <select
                    value={p.assignedTo ?? ''}
                    onChange={(e) => assignBringer(p, e.target.value || null)}
                    className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-200"
                  >
                    <option value="">{t('purchases.unassigned')}</option>
                    {event.users.map((u) => (
                      <option key={u.id} value={u.id}>{u.alias ? `${u.name} (${u.alias})` : u.name}</option>
                    ))}
                  </select>
                </label>
              ) : hasLinks ? (
                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">
                      {t('purchases.boughtProgress', {
                        n: round2(bought),
                        total: round2(total),
                        unit: displayUnit(p.unit, t),
                      })}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${total > 0 ? Math.min(100, (bought / total) * 100) : 100}%` }}
                    />
                  </div>
                  <span className="text-slate-400">{t('purchases.boughtByMany', { names: buyerNames })}</span>
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-1 text-slate-400">
                    <input
                      type="checkbox"
                      checked={p.purchased}
                      onChange={(e) => toggleBought(p, e.target.checked)}
                      className="size-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                    />
                    {t('purchases.bought')}
                  </label>
                  <label className="ml-auto flex items-center gap-1 text-slate-400">
                    {t('purchases.assignedShort')}
                    <select
                      value={p.assignedTo ?? ''}
                      onChange={(e) => assignBuyer(p, e.target.value || null)}
                      className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-200"
                    >
                      <option value="">{t('purchases.unassigned')}</option>
                      {event.users
                        .filter((u) => u.kind === 'adult')
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.alias ? `${u.name} (${u.alias})` : u.name}</option>
                        ))}
                    </select>
                  </label>
                </>
              )}
                </div>
              </li>
              )
            })}
          </ul>
          )}
        </div>
      ))}
      {deleted.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            {showDeleted ? '▾' : '▸'} {t('purchases.showDeleted', { count: deleted.length })}
          </button>
          {showDeleted && (
            <ul className="mt-2 space-y-2">
              {deleted.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm">
                  <span className="text-slate-500 line-through">{p.item}</span>
                  <button
                    type="button"
                    onClick={() => recover(p)}
                    className="rounded px-2 py-1 text-xs text-teal-300 hover:bg-slate-800"
                  >
                    ↺ {t('purchases.restore')}
                  </button>
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
      {renamingGroup !== null && (
        <Modal open title={t('purchases.renameGroupTitle')} dismissable onClose={() => setRenamingGroup(null)}>
          <div className="space-y-3">
            <Input value={groupNewName} onChange={(e) => setGroupNewName(e.target.value)} maxLength={50} placeholder={t('purchases.form.groupPlaceholder')} autoFocus />
            <p className="text-xs text-slate-500">{t('purchases.renameGroupHint')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setRenamingGroup(null)}>{t('common.cancel')}</Button>
              <Button type="button" onClick={submitRename}>{t('common.save')}</Button>
            </div>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal open title={t('purchases.deleteTitle')} dismissable onClose={() => setDeleting(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              {t('purchases.deleteConfirm', { item: deleting.item })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={confirmDelete}>
                {t('purchases.deleteYes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
