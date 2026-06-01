import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { ManualLiquidationSplitter } from '@/domain/services/ManualLiquidationSplitter'
import type { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import type { DeleteManualLiquidationHandler } from '@/application/handlers/DeleteManualLiquidationHandler'
import type { RecoverManualLiquidationHandler } from '@/application/handlers/RecoverManualLiquidationHandler'
import type { ToggleLiquidationShareHandler } from '@/application/handlers/ToggleLiquidationShareHandler'
import { reportError } from '@/shared/utils/reportError'

const fmt = (cents: number): string => (cents / 100).toFixed(2)

export function ManualLiquidations() {
  const { t } = useTranslation()
  const { event, setEvent } = useEventState()
  const container = useContainer()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const [adding, setAdding] = useState(false)
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState<string | ''>('')
  const [affects, setAffects] = useState<string[]>([])
  const [showDeleted, setShowDeleted] = useState(false)

  if (!event) return null
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'
  const live = event.manualLiquidations.filter((l) => !l.deleted)
  const deleted = event.manualLiquidations.filter((l) => l.deleted)

  function resetForm() {
    setConcept('')
    setAmount('')
    setPaidBy('')
    setAffects([])
    setAdding(false)
  }

  function submit() {
    if (!event || !me) return
    const euros = Number(amount)
    if (concept.trim().length < 3 || !Number.isFinite(euros) || euros <= 0) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<AddManualLiquidationHandler>('addManualLiquidation')
        const result = await handler.execute({
          eventId: event.id,
          userId: me.id,
          concept: concept.trim(),
          amountEuros: euros,
          paidBy: paidBy === '' ? null : paidBy,
          affects,
        })
        setEvent(result.event, result.version)
        resetForm()
      } catch (err) {
        reportError('ManualLiquidations', err)
      }
    })
  }

  function toggleShare(liquidationId: string, shareUserId: string) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<ToggleLiquidationShareHandler>('toggleLiquidationShare')
        const result = await handler.execute({
          eventId: event.id,
          userId: me.id,
          liquidationId,
          shareUserId,
        })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('ManualLiquidations', err)
      }
    })
  }

  function remove(liquidationId: string) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<DeleteManualLiquidationHandler>('deleteManualLiquidation')
        const result = await handler.execute({ eventId: event.id, userId: me.id, liquidationId })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('ManualLiquidations', err)
      }
    })
  }

  function recover(liquidationId: string) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<RecoverManualLiquidationHandler>(
          'recoverManualLiquidation',
        )
        const result = await handler.execute({ eventId: event.id, userId: me.id, liquidationId })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('ManualLiquidations', err)
      }
    })
  }

  function toggleAffect(id: string) {
    setAffects((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase text-muted">{t('liquidations.title')}</p>
        {!adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t('liquidations.add')}
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <input
            className="w-full rounded border border-border bg-elevated p-2 text-sm"
            placeholder={t('liquidations.concept')}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
          <input
            className="w-full rounded border border-border bg-elevated p-2 text-sm"
            type="number"
            inputMode="decimal"
            placeholder={t('liquidations.amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <label className="block text-xs text-muted">{t('liquidations.paidByLabel')}</label>
          <select
            className="w-full rounded border border-border bg-elevated p-2 text-sm"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            <option value="">{t('liquidations.noPayer')}</option>
            {event.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <label className="block text-xs text-muted">{t('liquidations.affects')}</label>
          <div className="flex flex-wrap gap-2">
            {event.users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleAffect(u.id)}
                className={`rounded-full px-3 py-1 text-xs ${
                  affects.includes(u.id) ? 'bg-brand text-white' : 'bg-elevated text-muted'
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={resetForm}>
              {t('liquidations.cancel')}
            </Button>
            <Button onClick={submit}>{t('liquidations.save')}</Button>
          </div>
        </div>
      )}

      {live.length === 0 && !adding && (
        <p className="text-sm text-muted">{t('liquidations.empty')}</p>
      )}

      <ul className="space-y-3">
        {live.map((liq) => {
          const view = ManualLiquidationSplitter.compute(
            liq,
            event.users.map((u) => u.id),
          )
          const isPending = liq.paidBy === null
          const perPersonCents = view.shares[0]?.cents ?? 0
          return (
            <li key={liq.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-ink">{liq.concept}</span>{' '}
                  <span className="text-sm text-muted">€{fmt(liq.cents)}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      isPending ? 'bg-warn-soft text-warn-soft-fg' : 'bg-pos-soft text-pos-soft-fg'
                    }`}
                  >
                    {isPending ? t('liquidations.pendingBadge') : nameOf(liq.paidBy!)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(liq.id)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-xs text-muted hover:text-danger"
                  aria-label={t('liquidations.delete')}
                >
                  🗑️
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t('liquidations.perPerson', { euros: fmt(perPersonCents) })}
              </p>
              <ul className="mt-2 space-y-1">
                {view.shares.map((s) => (
                  <li key={s.userId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.paid}
                      disabled={s.userId === liq.paidBy}
                      onChange={() => toggleShare(liq.id, s.userId)}
                      className="size-4 rounded border-border bg-elevated accent-pos"
                    />
                    <span className={s.paid ? 'text-muted line-through' : 'text-ink'}>
                      {nameOf(s.userId)} · €{fmt(s.cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      {deleted.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="inline-flex min-h-11 items-center text-xs text-muted hover:text-ink"
          >
            {showDeleted ? '▾' : '▸'} {t('liquidations.showDeleted', { count: deleted.length })}
          </button>
          {showDeleted && (
            <ul className="mt-2 space-y-2">
              {deleted.map((liq) => (
                <li
                  key={liq.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 p-3 text-sm"
                >
                  <span className="text-muted line-through">
                    {liq.concept} · €{fmt(liq.cents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => recover(liq.id)}
                    className="inline-flex min-h-11 items-center rounded px-2 py-1 text-xs text-brand hover:bg-elevated"
                  >
                    ↺ {t('liquidations.restore')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
