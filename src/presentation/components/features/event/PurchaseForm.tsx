import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import type { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { useOnlineStatus } from '@/presentation/context/SyncContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { AllergyChecker, type AllergyMatch } from '@/domain/services/AllergyChecker'
import { AllergyAlertModal } from './AllergyAlertModal'
import { reportError } from '@/shared/utils/reportError'

const CATEGORIES = ['food', 'drinks', 'snacks', 'other'] as const
const UNITS = ['units', 'bottles', 'cans', 'kg', 'liters'] as const

export function PurchaseForm({
  onDone,
  purchase,
}: {
  onDone: () => void
  purchase?: PurchaseSnapshot
}) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const online = useOnlineStatus()
  const { guardedExecute } = useWriteGuard()

  const inferredDays = (() => {
    if (!purchase) return 2
    const sumMul = purchase.consumers.reduce((s, c) => s + c.multiplier, 0)
    const totalDaily = purchase.dailyConsumption * sumMul
    if (totalDaily <= 0) return 2
    const d = Math.round(purchase.totalQuantity / totalDaily)
    return d > 0 ? d : 2
  })()

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    (purchase?.category as (typeof CATEGORIES)[number]) ?? 'drinks',
  )
  const [item, setItem] = useState(purchase?.item ?? '')
  const [quantity, _setQuantity] = useState(purchase?.quantity ?? 1)
  const [unit, setUnit] = useState<string>(purchase?.unit ?? 'units')
  const [dailyConsumption, setDailyConsumption] = useState(purchase?.dailyConsumption ?? 1)
  const [days, setDays] = useState(inferredDays)
  const [consumers, setConsumers] = useState<Record<string, number>>(() => {
    if (purchase) {
      const map: Record<string, number> = {}
      for (const c of purchase.consumers) map[c.userId] = c.multiplier
      return map
    }
    // New purchase: pre-select everyone at their default multiplier
    const map: Record<string, number> = {}
    for (const u of event?.users ?? []) {
      map[u.id] = u.kind === 'child' ? 0.5 : 1
    }
    return map
  })
  const [assignedTo, setAssignedTo] = useState<string | null>(purchase?.assignedTo ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingMatches, setPendingMatches] = useState<AllergyMatch[] | null>(null)

  if (!event || !me) return null

  function selectAllConsumers() {
    const map: Record<string, number> = {}
    for (const u of event?.users ?? []) {
      map[u.id] = u.kind === 'child' ? 0.5 : 1
    }
    setConsumers(map)
  }

  function selectNoConsumers() {
    setConsumers({})
  }

  function toggleConsumer(id: string) {
    setConsumers((prev) => {
      const copy = { ...prev }
      if (copy[id] !== undefined) {
        delete copy[id]
      } else {
        const user = event?.users.find((u) => u.id === id)
        copy[id] = user?.kind === 'child' ? 0.5 : 1
      }
      return copy
    })
  }

  function setMultiplier(id: string, m: number) {
    setConsumers((prev) => ({ ...prev, [id]: m }))
  }

  function doSave() {
    if (!event || !me) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const list = Object.entries(consumers).map(([userId, multiplier]) => ({ userId, multiplier }))
        if (purchase) {
          const handler = container.resolve<EditPurchaseHandler>('editPurchase')
          const result = await handler.execute({
            eventId: event.id,
            purchaseId: purchase.id,
            editedBy: me.id,
            category,
            item,
            quantity,
            unit,
            dailyConsumption,
            consumers: list,
            days,
            assignedTo: purchase.assignedTo ?? null,
          })
          container
            .resolve<LocalStorageCache>('cache')
            .set(event.id, { snapshot: result.event, version: result.version })
          setEvent(result.event, result.version)
        } else {
          const handler = container.resolve<AddPurchaseHandler>('addPurchase')
          const result = await handler.execute({
            eventId: event.id,
            createdBy: me.id,
            category,
            item,
            quantity,
            unit,
            dailyConsumption,
            consumers: list,
            days,
            assignedTo,
          })
          container
            .resolve<LocalStorageCache>('cache')
            .set(event.id, { snapshot: result.event, version: result.version })
          setEvent(result.event, result.version)
        }
        setPendingMatches(null)
        onDone()
      } catch (err) {
        reportError('PurchaseForm', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    }, (err) => {
      reportError('PurchaseForm', err)
      setError(err instanceof Error ? err.message : 'Error')
      setBusy(false)
    })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!event || !me) return
    // In edit mode, skip allergy check (item name is unchanged)
    if (!purchase) {
      const matches = AllergyChecker.findMatches({
        item,
        users: event.users.map((u) => ({
          userId: u.id,
          displayName: u.alias ? `${u.name} (${u.alias})` : u.name,
          allergies: u.allergies ?? [],
        })),
      })
      if (matches.length > 0) {
        setPendingMatches(matches)
        return
      }
    }
    doSave()
  }

  return (
    <>
      {pendingMatches && (
        <AllergyAlertModal
          item={item}
          matches={pendingMatches}
          onContinue={() => { doSave() }}
          onCancel={() => { setPendingMatches(null); setItem('') }}
        />
      )}
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
        {purchase && (
          <p className="text-sm font-medium text-slate-300">{t('purchases.form.editTitle')}: <span className="text-slate-100">{purchase.item}</span></p>
        )}
        <label className="block text-sm text-slate-300">
          {t('purchases.form.category')}
          <select
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 disabled:opacity-50"
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`purchases.form.categories.${c}`)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          {t('purchases.form.item')}
          <Input
            className="mt-1"
            placeholder={t('purchases.form.itemPlaceholder')}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            required
            minLength={2}
            maxLength={50}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-slate-300">
            {t('purchases.form.dailyConsumption')}
            <Input
              className="mt-1"
              type="number"
              min="0.5"
              max="100"
              step="0.5"
              value={dailyConsumption}
              onChange={(e) => setDailyConsumption(parseFloat(e.target.value))}
            />
          </label>
          <label className="block text-sm text-slate-300">
            {t('purchases.form.unit')}
            <input
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              list="unit-suggestions"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              maxLength={30}
              placeholder={t('purchases.form.unitPlaceholder')}
            />
            <datalist id="unit-suggestions">
              {UNITS.map((u) => (
                <option key={u} value={t(`purchases.form.units.${u}`)} />
              ))}
            </datalist>
          </label>
        </div>
        <p className="-mt-1 text-xs text-slate-500">{t('purchases.form.dailyConsumptionHelp')}</p>
        <label className="block text-sm text-slate-300">
          {t('purchases.form.days')}
          <Input
            className="mt-1"
            type="number"
            min="1"
            step="1"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
          />
        </label>
        <p className="-mt-1 text-xs text-slate-500">{t('purchases.form.daysHelp')}</p>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">{t('purchases.form.consumers')}</p>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={selectAllConsumers} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                {t('purchases.form.selectAll')}
              </button>
              <button type="button" onClick={selectNoConsumers} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                {t('purchases.form.selectNone')}
              </button>
            </div>
          </div>
          <ul className="space-y-1">
            {event.users.map((u) => {
              const selected = consumers[u.id] !== undefined
              const m = consumers[u.id] ?? 1
              return (
                <li key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleConsumer(u.id)}
                  />
                  <span>{u.alias ? `${u.name} (${u.alias})` : u.name}</span>
                  <YouLabel userId={u.id} />
                  {selected && (
                    <select
                      className="ml-auto rounded border border-slate-700 bg-slate-900 p-1 text-slate-200"
                      value={m}
                      onChange={(e) => setMultiplier(u.id, parseFloat(e.target.value))}
                    >
                      {[0.5, 1, 1.5, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>×{v}</option>
                      ))}
                    </select>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <label className="block text-sm text-slate-300">
          {t('purchases.form.assignedTo')}
          <select
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
            value={assignedTo ?? ''}
            onChange={(e) => setAssignedTo(e.target.value || null)}
          >
            <option value="">{t('purchases.form.assignedNobody')}</option>
            {event.users.map((u) => (
              <option key={u.id} value={u.id}>{u.alias ? `${u.name} (${u.alias})` : u.name}</option>
            ))}
          </select>
        </label>
        {(() => {
          const totalDaily = Object.values(consumers).reduce(
            (sum, mul) => sum + dailyConsumption * mul,
            0,
          )
          const total = totalDaily * days
          if (!Number.isFinite(total) || total <= 0) return null
          return (
            <div className="rounded-lg bg-violet-900/30 px-3 py-2 text-sm text-violet-100">
              {t('purchases.form.totalPreview', {
                n: Math.round(total * 100) / 100,
                unit,
              })}
            </div>
          )
        })()}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy || !online || (!purchase && !item) || Object.keys(consumers).length === 0}>
            {purchase ? t('purchases.form.update') : t('purchases.form.submit')}
          </Button>
        </div>
      </form>
    </>
  )
}
