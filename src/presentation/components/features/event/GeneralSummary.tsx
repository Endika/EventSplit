import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { computeTripTotals } from '@/domain/services/TripTotals'
import { payingUsers } from '@/domain/services/participantRoles'
import { formatMoney } from '@/presentation/utils/money'

/**
 * The trip's totals, as a ruled block rather than a second display figure.
 * It used to be a big number under a small label with two stats beneath it —
 * the hero-metric template — competing with the visitor's own balance and
 * printing the same total a third time on one screen.
 */
export function GeneralSummary() {
  const { t } = useTranslation()
  const { event } = useEventState()
  if (!event) return null

  const totals = computeTripTotals({
    participantIds: payingUsers(event.users).map((u) => u.id),
    expenses: event.expenses.map((e) => ({ cents: e.cents, deleted: e.deleted })),
    manualLiquidations: event.manualLiquidations.map((l) => ({
      cents: l.cents,
      paidBy: l.paidBy,
      affects: l.affects,
      paidShares: l.paidShares,
      deleted: l.deleted,
    })),
  })

  if (totals.totalCostCents === 0) return null

  const rows = [
    { key: 'totalCost', label: t('summary.general.totalCost'), value: totals.totalCostCents },
    { key: 'realSpent', label: t('summary.general.realSpent'), value: totals.realSpentCents },
    { key: 'pending', label: t('summary.general.pending'), value: totals.pendingCents },
  ]

  return (
    <section>
      <h3 className="fineprint mb-2">{t('summary.general.title')}</h3>
      <dl>
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0"
          >
            <dt className="min-w-0 truncate text-sm text-ink">{row.label}</dt>
            <dd className="shrink-0 text-sm font-semibold tabular-nums text-ink">
              {formatMoney(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
