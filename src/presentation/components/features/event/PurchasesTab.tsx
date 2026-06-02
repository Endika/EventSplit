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
import type { RenameSubgroupHandler } from '@/application/handlers/RenameSubgroupHandler'
import type { SetSubgroupOrderHandler } from '@/application/handlers/SetSubgroupOrderHandler'
import { reportError } from '@/shared/utils/reportError'
import { displayUnit } from '@/presentation/utils/units'
import { PurchaseForm } from './PurchaseForm'
import { ShareListModal } from './ShareListModal'

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
  const [onlyMine, setOnlyMine] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<PurchaseSnapshot | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [groupNewName, setGroupNewName] = useState('')
  const [renamingSubgroup, setRenamingSubgroup] = useState<{
    group: string
    subgroup: string
  } | null>(null)
  const [subgroupNewName, setSubgroupNewName] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
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

  const notDeleted = event.purchases.filter((p) => !p.deleted)
  const hasMine = notDeleted.some((p) => p.assignedTo === me?.id)
  // Opt-in visual filter: show only purchases assigned to me when toggled on.
  const visible = onlyMine ? notDeleted.filter((p) => p.assignedTo === me?.id) : notDeleted
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

  // Sort keys for a grouping level: explicitly-ordered first, then the rest
  // alphabetically, with the empty ('') bucket always last.
  function sortByOrder(keys: string[], order: string[]): string[] {
    return [...keys].sort((a, b) => {
      if (a === '') return 1
      if (b === '') return -1
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
  }

  const grouped = (() => {
    const map = new Map<string, PurchaseSnapshot[]>()
    for (const p of visible) {
      const key = p.group ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    const order = event.groupOrder ?? []
    const subOrders = event.subgroupOrder ?? {}
    const keys = sortByOrder([...map.keys()], order)
    return keys.map((group) => {
      const items = map.get(group)!
      // partition this group's items by subgroup ('' = no subgroup)
      const subMap = new Map<string, PurchaseSnapshot[]>()
      for (const p of items) {
        const sk = p.subgroup ?? ''
        if (!subMap.has(sk)) subMap.set(sk, [])
        subMap.get(sk)!.push(p)
      }
      const subKeys = sortByOrder([...subMap.keys()], subOrders[group] ?? [])
      const subgroups = subKeys.map((subgroup) => ({ subgroup, items: subMap.get(subgroup)! }))
      return { group, items, subgroups }
    })
  })()

  // Stable collapse key for a subgroup. NUL can't occur in trimmed user input,
  // so it can't collide with a plain group key.
  const subCollapseKey = (group: string, subgroup: string) => `${group}\u0000${subgroup}`

  function assignBuyer(p: PurchaseSnapshot, assignedTo: string | null) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<AssignPurchaseHandler>('assignPurchase')
        const result = await handler.execute({
          eventId: event.id,
          purchaseId: p.id,
          editedBy: me.id,
          assignedTo,
          purchased: p.purchased,
        })
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
          eventId: event.id,
          purchaseId: p.id,
          editedBy: me.id,
          assignedTo,
          purchased: false,
        })
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
          eventId: event.id,
          purchaseId: p.id,
          editedBy: me.id,
          assignedTo: p.assignedTo ?? null,
          purchased,
        })
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
        const result = await handler.execute({
          eventId: event.id,
          purchaseId: p.id,
          recoveredBy: me.id,
        })
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
      setDeleteBusy(true)
      try {
        const handler = container.resolve<DeletePurchaseHandler>('deletePurchase')
        const result = await handler.execute({
          eventId: event.id,
          purchaseId: target.id,
          deletedBy: me.id,
        })
        setEvent(result.event, result.version)
        setDeleting(null)
      } catch (err) {
        reportError('PurchasesTab', err)
      } finally {
        setDeleteBusy(false)
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
        setEvent(result.event, result.version)
        setRenamingGroup(null)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function moveSubgroup(group: string, subgroup: string, dir: -1 | 1) {
    if (!event || !me) return
    const groupEntry = grouped.find((g) => g.group === group)
    if (!groupEntry) return
    // current visual order of real subgroups in this group (excludes the no-subgroup bucket)
    const realSubgroups = groupEntry.subgroups.map((s) => s.subgroup).filter((s) => s !== '')
    const idx = realSubgroups.indexOf(subgroup)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= realSubgroups.length) return
    const next = [...realSubgroups]
    ;[next[idx], next[target]] = [next[target]!, next[idx]!]
    guardedExecute(async () => {
      try {
        const handler = container.resolve<SetSubgroupOrderHandler>('setSubgroupOrder')
        const result = await handler.execute({
          eventId: event.id,
          userId: me.id,
          group,
          order: next,
        })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function submitRenameSubgroup() {
    if (!event || !me || renamingSubgroup === null) return
    const { group, subgroup: from } = renamingSubgroup
    const to = subgroupNewName
    guardedExecute(async () => {
      try {
        const handler = container.resolve<RenameSubgroupHandler>('renameSubgroup')
        const result = await handler.execute({ eventId: event.id, userId: me.id, group, from, to })
        setEvent(result.event, result.version)
        setRenamingSubgroup(null)
      } catch (err) {
        reportError('PurchasesTab', err)
      }
    })
  }

  function renderItems(items: PurchaseSnapshot[]) {
    return (
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
              className={`rounded-xl border bg-surface p-3 ${
                editing?.id === p.id ? 'border-brand ring-1 ring-brand' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => requestEdit(p)}
                  className="flex-1 rounded text-left hover:opacity-80"
                  aria-label={t('purchases.edit')}
                >
                  <div className={`font-medium ${struck ? 'text-muted line-through' : 'text-ink'}`}>
                    {p.kind === 'bring' && <span title={t('purchases.form.modeBring')}>🏠 </span>}
                    {p.item} <span className="text-xs text-muted">✎</span>
                  </div>
                  <div className="text-sm text-muted">
                    {t(p.kind === 'bring' ? 'purchases.totalToBring' : 'purchases.totalQuantity', {
                      n: Math.round(p.totalQuantity * 100) / 100,
                      unit: displayUnit(p.unit, t, p.totalQuantity),
                    })}
                  </div>
                  <div className="text-xs text-muted">
                    {t('purchases.createdBy', { name: userName(p.createdBy) })}
                    <YouLabel userId={p.createdBy} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => askDelete(p)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-xs text-muted hover:bg-elevated hover:text-danger"
                  aria-label={t('purchases.delete')}
                  title={t('purchases.delete')}
                >
                  🗑️
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs">
                {p.kind === 'bring' ? (
                  <label className="ml-auto flex items-center gap-1 text-muted">
                    {t('purchases.broughtByShort')}
                    <select
                      value={p.assignedTo ?? ''}
                      onChange={(e) => assignBringer(p, e.target.value || null)}
                      className="min-h-11 rounded border border-border bg-surface p-1 text-base text-ink sm:text-sm"
                    >
                      <option value="">{t('purchases.unassigned')}</option>
                      {event!.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.alias ? `${u.name} (${u.alias})` : u.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : hasLinks ? (
                  <div className="flex w-full flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink">
                        {t('purchases.boughtProgress', {
                          n: round2(bought),
                          total: round2(total),
                          unit: displayUnit(p.unit, t, total),
                        })}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{
                          width: `${total > 0 ? Math.min(100, (bought / total) * 100) : 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-muted">
                      {t('purchases.boughtByMany', { names: buyerNames })}
                    </span>
                  </div>
                ) : (
                  <>
                    <label className="flex items-center gap-1 text-muted">
                      <input
                        type="checkbox"
                        checked={p.purchased}
                        onChange={(e) => toggleBought(p, e.target.checked)}
                        className="size-4 rounded border-border bg-elevated accent-brand"
                      />
                      {t('purchases.bought')}
                    </label>
                    <label className="ml-auto flex items-center gap-1 text-muted">
                      {t('purchases.assignedShort')}
                      <select
                        value={p.assignedTo ?? ''}
                        onChange={(e) => assignBuyer(p, e.target.value || null)}
                        className="min-h-11 rounded border border-border bg-surface p-1 text-base text-ink sm:text-sm"
                      >
                        <option value="">{t('purchases.unassigned')}</option>
                        {event!.users
                          .filter((u) => u.kind === 'adult')
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.alias ? `${u.name} (${u.alias})` : u.name}
                            </option>
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
    )
  }

  return (
    <div className="space-y-3">
      {!adding && !editing && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAdding(true)}>{t('purchases.add')}</Button>
          {visible.length > 0 && (
            <Button variant="secondary" onClick={() => setSharing(true)}>
              📤 {t('share.button')}
            </Button>
          )}
          {hasMine && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={() => setOnlyMine((v) => !v)}
                className="size-4 rounded border-border bg-elevated accent-brand"
              />
              {t('common.onlyMine')}
            </label>
          )}
        </div>
      )}
      {adding && (
        <PurchaseForm
          key="new"
          onDone={() => {
            setAdding(false)
            setFormDirty(false)
          }}
          onDirtyChange={setFormDirty}
        />
      )}
      {editing && (
        <PurchaseForm
          key={editing.id}
          purchase={editing}
          onDone={() => {
            setEditing(null)
            setFormDirty(false)
          }}
          onDirtyChange={setFormDirty}
        />
      )}
      {visible.length === 0 && <p className="text-sm text-muted">{t('purchases.empty')}</p>}
      {grouped.map(({ group, items, subgroups }) => (
        <div key={group || '__none__'} className="space-y-2">
          {group !== '' && (
            <div className="flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => toggleCollapse(group)}
                className="flex flex-1 items-center gap-1.5 rounded-lg py-2 text-left text-xs font-semibold uppercase tracking-wide text-brand hover:bg-elevated/50"
                aria-label={t('purchases.toggleGroup')}
              >
                <span className="text-sm text-muted">{collapsed.has(group) ? '▸' : '▾'}</span>
                {group} <span className="text-muted">({items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => moveGroup(group, -1)}
                className="flex size-11 items-center justify-center rounded-lg text-base text-muted hover:bg-elevated hover:text-ink"
                aria-label={t('purchases.moveUp')}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveGroup(group, 1)}
                className="flex size-11 items-center justify-center rounded-lg text-base text-muted hover:bg-elevated hover:text-ink"
                aria-label={t('purchases.moveDown')}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenamingGroup(group)
                  setGroupNewName(group)
                }}
                className="flex size-11 items-center justify-center rounded-lg text-base text-muted hover:bg-elevated hover:text-ink"
                aria-label={t('purchases.renameGroup')}
              >
                ✎
              </button>
            </div>
          )}
          {group === '' && grouped.length > 1 && (
            <button
              type="button"
              onClick={() => toggleCollapse(group)}
              className="flex w-full items-center gap-1.5 rounded-lg px-1 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brand hover:bg-elevated/50"
              aria-label={t('purchases.toggleGroup')}
            >
              <span className="text-sm text-muted">{collapsed.has(group) ? '▸' : '▾'}</span>
              {t('purchases.noGroup')} <span className="text-muted">({items.length})</span>
            </button>
          )}
          {!collapsed.has(group) && (
            <div className="space-y-2">
              {subgroups.map(({ subgroup, items: subItems }) =>
                subgroup === '' ? (
                  // items with no subgroup render directly under the group
                  <div key="__nosub__">{renderItems(subItems)}</div>
                ) : (
                  <div key={subgroup} className="space-y-2">
                    <div className="flex items-center gap-2 pl-4 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleCollapse(subCollapseKey(group, subgroup))}
                        className="flex flex-1 items-center gap-1.5 rounded-lg py-1.5 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-brand hover:bg-elevated/50"
                        aria-label={t('purchases.toggleSubgroup')}
                      >
                        <span className="text-xs text-muted">
                          {collapsed.has(subCollapseKey(group, subgroup)) ? '▸' : '▾'}
                        </span>
                        {subgroup} <span className="text-muted">({subItems.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSubgroup(group, subgroup, -1)}
                        className="flex size-11 items-center justify-center rounded-lg text-sm text-muted hover:bg-elevated hover:text-ink"
                        aria-label={t('purchases.moveSubgroupUp')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSubgroup(group, subgroup, 1)}
                        className="flex size-11 items-center justify-center rounded-lg text-sm text-muted hover:bg-elevated hover:text-ink"
                        aria-label={t('purchases.moveSubgroupDown')}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingSubgroup({ group, subgroup })
                          setSubgroupNewName(subgroup)
                        }}
                        className="flex size-11 items-center justify-center rounded-lg text-sm text-muted hover:bg-elevated hover:text-ink"
                        aria-label={t('purchases.renameSubgroup')}
                      >
                        ✎
                      </button>
                    </div>
                    {!collapsed.has(subCollapseKey(group, subgroup)) && (
                      <div className="pl-4">{renderItems(subItems)}</div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
      {deleted.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="inline-flex min-h-11 items-center text-xs text-muted hover:text-ink"
          >
            {showDeleted ? '▾' : '▸'} {t('purchases.showDeleted', { count: deleted.length })}
          </button>
          {showDeleted && (
            <ul className="mt-2 space-y-2">
              {deleted.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface/50 p-3 text-sm"
                >
                  <span className="text-muted line-through">{p.item}</span>
                  <button
                    type="button"
                    onClick={() => recover(p)}
                    className="inline-flex min-h-11 items-center rounded px-2 py-1 text-xs text-brand hover:bg-elevated"
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
        <Modal
          open
          title={t('common.unsavedTitle')}
          dismissable
          onClose={() => setPendingEdit(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">{t('common.unsavedBody')}</p>
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
        <Modal
          open
          title={t('purchases.renameGroupTitle')}
          dismissable
          onClose={() => setRenamingGroup(null)}
        >
          <div className="space-y-3">
            <Input
              value={groupNewName}
              onChange={(e) => setGroupNewName(e.target.value)}
              maxLength={50}
              placeholder={t('purchases.form.groupPlaceholder')}
              autoFocus
            />
            <p className="text-xs text-muted">{t('purchases.renameGroupHint')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setRenamingGroup(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={submitRename}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {renamingSubgroup !== null && (
        <Modal
          open
          title={t('purchases.renameSubgroupTitle')}
          dismissable
          onClose={() => setRenamingSubgroup(null)}
        >
          <div className="space-y-3">
            <Input
              value={subgroupNewName}
              onChange={(e) => setSubgroupNewName(e.target.value)}
              maxLength={50}
              placeholder={t('purchases.form.subgroupPlaceholder')}
              autoFocus
            />
            <p className="text-xs text-muted">{t('purchases.renameSubgroupHint')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setRenamingSubgroup(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={submitRenameSubgroup}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal
          open
          title={t('purchases.deleteTitle')}
          dismissable
          onClose={() => setDeleting(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              {t('purchases.deleteConfirm', { item: deleting.item })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={confirmDelete} loading={deleteBusy}>
                {t('purchases.deleteYes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <ShareListModal open={sharing} event={event} onClose={() => setSharing(false)} />
    </div>
  )
}
