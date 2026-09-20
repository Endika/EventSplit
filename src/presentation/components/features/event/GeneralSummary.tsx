import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { computeTripTotals } from '@/domain/services/TripTotals'
import { payingUsers } from '@/domain/services/participantRoles'
import { formatMoney } from '@/presentation/utils/money'

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

  return (
    <section className="border border-border bg-surface px-4 pb-4 pt-5">
      <p className="fineprint">{t('summary.general.title')}</p>
      <span className="price mt-1 block text-[clamp(2.75rem,15vw,4.5rem)] text-ink">
        {formatMoney(totals.totalCostCents)}
      </span>
      <span className="fineprint mt-2 block">{t('summary.general.totalCost')}</span>

      <div className="rail mt-4" />

      <dl className="mt-3">
        <div className="flex items-baseline justify-between gap-3 border-b border-border py-2">
          <dt className="fineprint">{t('summary.general.realSpent')}</dt>
          <dd className="shrink-0 text-sm font-semibold tabular-nums text-pos">
            {formatMoney(totals.realSpentCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="fineprint">{t('summary.general.pending')}</dt>
          <dd
            className={`shrink-0 text-sm font-semibold tabular-nums ${
              totals.pendingCents > 0 ? 'text-warn' : 'text-muted'
            }`}
          >
            {formatMoney(totals.pendingCents)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
