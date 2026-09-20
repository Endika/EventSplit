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
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase text-muted">{t('summary.general.title')}</p>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t('summary.general.totalCost')}</dt>
          <dd className="text-ink">{formatMoney(totals.totalCostCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t('summary.general.realSpent')}</dt>
          <dd className="text-pos">{formatMoney(totals.realSpentCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t('summary.general.pending')}</dt>
          <dd className={totals.pendingCents > 0 ? 'text-warn' : 'text-muted'}>
            {formatMoney(totals.pendingCents)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
