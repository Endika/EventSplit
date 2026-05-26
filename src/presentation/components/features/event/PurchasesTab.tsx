import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { Modal } from '@/presentation/components/common/Modal'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { AssignPurchaseHandler } from '@/application/handlers/AssignPurchaseHandler'
import type { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import type { RecoverPurchaseHandler } from '@/application/handlers/RecoverPurchaseHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { reportError } from '@/shared/utils/reportError'
import { PurchaseForm } from './PurchaseForm'

const KNOWN_UNITS = ['units', 'bottles', 'cans', 'kg', 'liters']
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
  if (!event) return null

  const visible = event.purchases.filter((p) => !p.deleted)
  const deleted = event.purchases.filter((p) => p.deleted)
  const userName = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

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

  return (
    <div className="space-y-3">
      {!adding && !editing && <Button onClick={() => setAdding(true)}>{t('purchases.add')}</Button>}
      {adding && <PurchaseForm onDone={() => setAdding(false)} />}
      {editing && <PurchaseForm purchase={editing} onDone={() => setEditing(null)} />}
      {visible.length === 0 && <p className="text-sm text-slate-400">{t('purchases.empty')}</p>}
      <ul className="space-y-2">
        {visible.map((p) => (
          <li
            key={p.id}
            className={`rounded-lg border bg-slate-900 p-3 ${
              editing?.id === p.id ? 'border-violet-500 ring-1 ring-violet-500' : 'border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="flex-1 rounded text-left hover:opacity-80"
                aria-label={t('purchases.edit')}
              >
                <div className={`font-medium ${p.purchased ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                  {p.item} <span className="text-xs text-slate-500">✎</span>
                </div>
                <div className="text-sm text-slate-400">
                  {t('purchases.totalQuantity', { n: p.totalQuantity, unit: displayUnit(p.unit, t) })}
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
            </div>
          </li>
        ))}
      </ul>
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
