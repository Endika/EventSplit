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
import {
  IconChevron,
  IconHome,
  IconPencil,
  IconShare,
  IconTrash,
  IconUndo,
} from '@/presentation/components/common/icons'
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
import {
  groupPurchases,
  movedGroupOrder,
  movedSubgroupOrder,
  subCollapseKey,
} from '@/presentation/utils/groupPurchases'
import {
  boughtQuantity,
  buyerIds,
  hasLinkedExpense,
  isPurchaseDone,
  progressPercent,
} from '@/presentation/utils/purchaseProgress'
import { assignedTo, visiblePurchases } from '@/presentation/utils/purchaseFilters'
import { live, toggleInSet, trashed } from '@/presentation/utils/collections'
import { userLabel, userName as nameOfUser } from '@/presentation/utils/userLabel'
import { PurchaseForm } from './PurchaseForm'
import { ShareListModal } from './ShareListModal'
import { canBeAssigned, canBring } from '@/domain/services/participantRoles'
import { PrimaryAction } from '@/presentation/components/common/PrimaryAction'
import { formatQuantity } from '@/presentation/utils/quantity'

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

  const toggleCollapse = (group: string) => setCollapsed((prev) => toggleInSet(prev, group))

  function requestEdit(p: PurchaseSnapshot) {
    // If a form is open with unsaved changes for a DIFFERENT item, confirm first.
    if ((editing || adding) && formDirty && editing?.id !== p.id) {
      setPendingEdit(p)
      return
    }
    setAdding(false)
    setEditing(p)
  }

  const notDeleted = live(event.purchases)
  const hasMine = assignedTo(notDeleted, me?.id).length > 0
  // Opt-in visual filter: show only purchases assigned to me when toggled on.
  const visible = visiblePurchases(notDeleted, onlyMine, me?.id)
  const deleted = trashed(event.purchases)
  const userName = (id: string) => nameOfUser(event.users, id)

  const grouped = groupPurchases(event, visible)

  function assign(p: PurchaseSnapshot, buyer: string | null, purchased: boolean) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<AssignPurchaseHandler>('assignPurchase')
        const result = await handler.execute({
          eventId: event.id,
          purchaseId: p.id,
          editedBy: me.id,
          assignedTo: buyer,
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
    const next = movedGroupOrder(grouped, group, dir)
    if (!next) return
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
    const next = movedSubgroupOrder(grouped, group, subgroup, dir)
    if (!next) return
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
      <ul className="border-t border-border">
        {items.map((p) => {
          const hasLinks = p.kind !== 'bring' && hasLinkedExpense(event!, p.id)
          const bought = hasLinks ? boughtQuantity(event!, p.id) : 0
          const total = p.totalQuantity
          const struck = isPurchaseDone(event!, p)
          const buyerNames = hasLinks ? buyerIds(event!, p.id).map(userName).join(', ') : ''
          return (
            <li
              key={p.id}
              className={`border-b border-border ${editing?.id === p.id ? 'bg-brand-soft' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => requestEdit(p)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2 text-left"
                  aria-label={t('purchases.edit')}
                  title={t(
                    p.kind === 'bring' ? 'purchases.totalToBring' : 'purchases.totalQuantity',
                    {
                      n: formatQuantity(p.totalQuantity),
                      unit: displayUnit(p.unit, t, p.totalQuantity),
                    },
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`flex min-w-0 items-center gap-1 font-semibold ${
                        struck ? 'text-muted line-through' : 'text-ink'
                      }`}
                    >
                      {p.kind === 'bring' && <IconHome className="size-4 shrink-0" />}
                      <span className="truncate">{p.item}</span>
                      <IconPencil className="size-3.5 shrink-0 text-muted" />
                    </span>
                    <span className="fineprint flex items-center">
                      {t('purchases.createdBy', { name: userName(p.createdBy) })}
                      <YouLabel userId={p.createdBy} />
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-ink">
                    {formatQuantity(p.totalQuantity)} {displayUnit(p.unit, t, p.totalQuantity)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => askDelete(p)}
                  className="inline-flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-danger"
                  aria-label={t('purchases.delete')}
                  title={t('purchases.delete')}
                >
                  <IconTrash className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2 text-xs">
                {p.kind === 'bring' ? (
                  <label className="ml-auto flex min-h-11 items-center gap-1.5 text-muted">
                    {t('purchases.broughtByShort')}
                    <select
                      value={p.assignedTo ?? ''}
                      onChange={(e) => assign(p, e.target.value || null, false)}
                      className="min-h-11 max-w-[9rem] truncate border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                    >
                      <option value="">{t('purchases.unassigned')}</option>
                      {event!.users
                        .filter((u) => canBring(u.kind))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {userLabel(u)}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : hasLinks ? (
                  <div className="flex w-full flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {t('purchases.boughtProgress', {
                          n: formatQuantity(bought),
                          total: formatQuantity(total),
                          unit: displayUnit(p.unit, t, total),
                        })}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden bg-elevated">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${progressPercent(bought, total)}%` }}
                      />
                    </div>
                    <span className="fineprint">
                      {t('purchases.boughtByMany', { names: buyerNames })}
                    </span>
                  </div>
                ) : (
                  <>
                    <label className="flex min-h-11 cursor-pointer items-center gap-1.5 text-muted">
                      <input
                        type="checkbox"
                        checked={p.purchased}
                        onChange={(e) => assign(p, p.assignedTo ?? null, e.target.checked)}
                        className="size-5 border-border bg-elevated accent-brand"
                      />
                      {t('purchases.bought')}
                    </label>
                    <label className="ml-auto flex min-h-11 items-center gap-1.5 text-muted">
                      {t('purchases.assignedShort')}
                      <select
                        value={p.assignedTo ?? ''}
                        onChange={(e) => assign(p, e.target.value || null, p.purchased)}
                        className="min-h-11 max-w-[9rem] truncate border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                      >
                        <option value="">{t('purchases.unassigned')}</option>
                        {event!.users
                          .filter((u) => canBeAssigned(u.kind))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {userLabel(u)}
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
          <PrimaryAction>
            <Button className="w-full" onClick={() => setAdding(true)}>
              {t('purchases.add')}
            </Button>
          </PrimaryAction>
          {visible.length > 0 && (
            <Button variant="secondary" onClick={() => setSharing(true)}>
              <IconShare className="size-4" />
              {t('share.button')}
            </Button>
          )}
          {hasMine && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={() => setOnlyMine((v) => !v)}
                className="size-5 border-border bg-elevated accent-brand"
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
      {visible.length === 0 && <p className="fineprint">{t('purchases.empty')}</p>}
      {grouped.map(({ group, items, subgroups }) => (
        <div key={group || '__none__'} className="space-y-2">
          {group !== '' && (
            <div className="flex items-center gap-1 border-b-2 border-rail">
              <button
                type="button"
                onClick={() => toggleCollapse(group)}
                className="fineprint flex min-h-11 flex-1 items-center gap-1.5 text-left text-brand hover:text-ink"
                aria-label={t('purchases.toggleGroup')}
              >
                <IconChevron
                  dir={collapsed.has(group) ? 'right' : 'down'}
                  className="size-3.5 text-muted"
                />
                <span className="truncate">{group}</span>
                <span className="shrink-0 text-muted">({items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => moveGroup(group, -1)}
                className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                aria-label={t('purchases.moveUp')}
              >
                <IconChevron dir="up" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => moveGroup(group, 1)}
                className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                aria-label={t('purchases.moveDown')}
              >
                <IconChevron dir="down" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenamingGroup(group)
                  setGroupNewName(group)
                }}
                className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                aria-label={t('purchases.renameGroup')}
              >
                <IconPencil className="size-4" />
              </button>
            </div>
          )}
          {group === '' && grouped.length > 1 && (
            <button
              type="button"
              onClick={() => toggleCollapse(group)}
              className="fineprint flex min-h-11 w-full items-center gap-1.5 border-b-2 border-rail text-left text-brand hover:text-ink"
              aria-label={t('purchases.toggleGroup')}
            >
              <IconChevron
                dir={collapsed.has(group) ? 'right' : 'down'}
                className="size-3.5 text-muted"
              />
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
                    <div className="flex items-center gap-1 border-b border-border pl-3">
                      <button
                        type="button"
                        onClick={() => toggleCollapse(subCollapseKey(group, subgroup))}
                        className="fineprint flex min-h-11 flex-1 items-center gap-1.5 text-left text-ink hover:text-brand"
                        aria-label={t('purchases.toggleSubgroup')}
                      >
                        <IconChevron
                          dir={collapsed.has(subCollapseKey(group, subgroup)) ? 'right' : 'down'}
                          className="size-3 text-muted"
                        />
                        <span className="truncate">{subgroup}</span>
                        <span className="shrink-0 text-muted">({subItems.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSubgroup(group, subgroup, -1)}
                        className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                        aria-label={t('purchases.moveSubgroupUp')}
                      >
                        <IconChevron dir="up" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSubgroup(group, subgroup, 1)}
                        className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                        aria-label={t('purchases.moveSubgroupDown')}
                      >
                        <IconChevron dir="down" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingSubgroup({ group, subgroup })
                          setSubgroupNewName(subgroup)
                        }}
                        className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                        aria-label={t('purchases.renameSubgroup')}
                      >
                        <IconPencil className="size-3.5" />
                      </button>
                    </div>
                    {!collapsed.has(subCollapseKey(group, subgroup)) && (
                      <div className="pl-3">{renderItems(subItems)}</div>
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
            className="fineprint inline-flex min-h-11 items-center hover:text-ink"
          >
            <IconChevron dir={showDeleted ? 'down' : 'right'} className="mr-1.5 size-3.5" />
            {t('purchases.showDeleted', { count: deleted.length })}
          </button>
          {showDeleted && (
            <ul className="border-t border-border">
              {deleted.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 border-b border-border text-sm"
                >
                  <span className="min-w-0 truncate text-muted line-through">{p.item}</span>
                  <button
                    type="button"
                    onClick={() => recover(p)}
                    className="fineprint inline-flex min-h-11 shrink-0 items-center px-2 text-brand hover:text-ink"
                  >
                    <IconUndo className="mr-1.5 size-3.5" />
                    {t('purchases.restore')}
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
