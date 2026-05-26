import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { useOnlineStatus } from '@/presentation/context/SyncContext'

const CATEGORIES = ['food', 'drinks', 'snacks', 'other'] as const
const UNITS = ['units', 'bottles', 'cans', 'kg', 'liters'] as const

export function PurchaseForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const online = useOnlineStatus()
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('drinks')
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('units')
  const [dailyConsumption, setDailyConsumption] = useState(1)
  const [days, setDays] = useState(2)
  const [consumers, setConsumers] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!event || !me) return null

  function toggleConsumer(id: string) {
    setConsumers((prev) => {
      const copy = { ...prev }
      if (copy[id] !== undefined) delete copy[id]
      else copy[id] = 1
      return copy
    })
  }

  function setMultiplier(id: string, m: number) {
    setConsumers((prev) => ({ ...prev, [id]: m }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!event || !me) return
    setBusy(true)
    setError(null)
    try {
      const list = Object.entries(consumers).map(([userId, multiplier]) => ({ userId, multiplier }))
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
      })
      container
        .resolve<LocalStorageCache>('cache')
        .set(event.id, { snapshot: result.event, version: result.version })
      setEvent(result.event, result.version)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <label className="block text-sm text-slate-300">
        {t('purchases.form.category')}
        <select
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <Input
        placeholder={t('purchases.form.item')}
        value={item}
        onChange={(e) => setItem(e.target.value)}
        required
        minLength={2}
        maxLength={50}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          min="0.5"
          max="10000"
          step="0.5"
          placeholder={t('purchases.form.quantity')}
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value))}
        />
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
          value={unit}
          onChange={(e) => setUnit(e.target.value as (typeof UNITS)[number])}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      <Input
        type="number"
        min="0.5"
        max="100"
        step="0.5"
        placeholder={t('purchases.form.dailyConsumption')}
        value={dailyConsumption}
        onChange={(e) => setDailyConsumption(parseFloat(e.target.value))}
      />
      <Input
        type="number"
        min="1"
        step="1"
        placeholder={t('purchases.form.days')}
        value={days}
        onChange={(e) => setDays(parseInt(e.target.value, 10))}
      />
      <div>
        <p className="mb-2 text-sm font-medium text-slate-300">{t('purchases.form.consumers')}</p>
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
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onDone} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={busy || !online || !item || Object.keys(consumers).length === 0}>
          {t('purchases.form.submit')}
        </Button>
      </div>
    </form>
  )
}
