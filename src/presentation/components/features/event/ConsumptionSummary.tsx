import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { UserConsumptionAggregator } from '@/domain/services/UserConsumptionAggregator'
import { formatConsumptionSummary } from '@/presentation/utils/formatConsumptionSummary'
import { displayUnit } from '@/presentation/utils/units'

export function ConsumptionSummary({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const { event } = useEventState()

  const blocks = useMemo(() => {
    if (!event) return null
    const result = UserConsumptionAggregator.compute(event, userId)
    return formatConsumptionSummary(result, t)
  }, [event, userId, t])

  if (!event || !blocks) return null

  if (event.purchases.filter((p) => !p.deleted).length === 0) {
    return (
      <section className="mt-6 rounded-xl bg-surface/60 p-4 ring-1 ring-border">
        <p className="text-sm text-ink">{t('consumption.noPurchases')}</p>
      </section>
    )
  }

  if (blocks.mode === 'empty') {
    return (
      <section className="mt-6 rounded-xl bg-surface/60 p-4 ring-1 ring-border">
        <p className="text-sm text-ink">{blocks.emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="mt-6 rounded-xl bg-surface/60 p-4 ring-1 ring-border">
      {blocks.mode === 'full' && (
        <>
          <h3 className="mb-2 text-sm font-semibold text-ink">{t('consumption.title')}</h3>
          <hr className="mb-3 border-border" />
          {blocks.detail.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm text-ink">
              {blocks.detail.map((d, idx) => (
                <li key={`${d.item}-${idx}`}>
                  • {d.item} · {d.quantity} {displayUnit(d.unit, t, d.quantity)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {blocks.brought.length > 0 && (
        <>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">
            {t('consumption.youBring')}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-ink">
            {blocks.brought.map((b, idx) => (
              <li key={`${b.item}-${idx}`}>• {b.item}</li>
            ))}
          </ul>
        </>
      )}

      {blocks.shared.length > 0 && (
        <>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">
            {t('consumption.groupShared')}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-ink">
            {blocks.shared.map((s, idx) => (
              <li key={`${s.item}-${idx}`}>• {s.item}</li>
            ))}
          </ul>
        </>
      )}

      {blocks.closing && <p className="mt-2 text-sm text-ink">{blocks.closing}</p>}
    </section>
  )
}
