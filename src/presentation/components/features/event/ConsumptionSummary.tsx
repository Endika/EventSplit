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
      <section className="mt-6 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <p className="text-sm text-slate-300">{t('consumption.noPurchases')}</p>
      </section>
    )
  }

  if (blocks.mode === 'empty') {
    return (
      <section className="mt-6 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <p className="text-sm text-slate-300">{blocks.emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="mt-6 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      {blocks.mode === 'full' && (
        <>
          <h3 className="mb-2 text-sm font-semibold text-slate-100">{t('consumption.title')}</h3>
          <hr className="mb-3 border-slate-700" />
          {blocks.detail.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm text-slate-200">
              {blocks.detail.map((d, idx) => (
                <li key={`${d.item}-${idx}`}>
                  • {d.item} · {d.quantity} {displayUnit(d.unit, t)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {blocks.brought.length > 0 && (
        <>
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
            {t('consumption.youBring')}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-slate-200">
            {blocks.brought.map((b, idx) => (
              <li key={`${b.item}-${idx}`}>• {b.item}</li>
            ))}
          </ul>
        </>
      )}

      {blocks.shared.length > 0 && (
        <>
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
            {t('consumption.groupShared')}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-slate-200">
            {blocks.shared.map((s, idx) => (
              <li key={`${s.item}-${idx}`}>• {s.item}</li>
            ))}
          </ul>
        </>
      )}

      {blocks.closing && <p className="mt-2 text-sm text-slate-300">{blocks.closing}</p>}
    </section>
  )
}
