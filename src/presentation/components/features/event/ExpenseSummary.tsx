import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { buildExpenseSummary } from '@/presentation/utils/expenseSummary'
import { toggleInSet } from '@/presentation/utils/collections'
import { formatMoney, formatSignedMoney } from '@/presentation/utils/money'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import type { ToggleSettlementHandler } from '@/application/handlers/ToggleSettlementHandler'
import { reportError } from '@/shared/utils/reportError'

export function ExpenseSummary() {
  const { t } = useTranslation()
  const { event, setEvent } = useEventState()
  const container = useContainer()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const [unfolded, setUnfolded] = useState(false)
  const [openBreakdowns, setOpenBreakdowns] = useState<ReadonlySet<string>>(new Set())
  if (!event) return null

  function toggleSettled(from: string, to: string) {
    if (!event || !me) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<ToggleSettlementHandler>('toggleSettlement')
        const result = await handler.execute({ eventId: event.id, userId: me.id, from, to })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('ExpenseSummary', err)
      }
    })
  }

  const {
    result,
    mine,
    myCarried,
    shown,
    hiddenCount,
    allSquare,
    myExpenses,
    householdOf,
    isSettled,
    nameOf,
    partyName,
    householdMembers,
    householdRepresentedBy,
    householdSides,
    memberBalance,
    carriedNames,
    guardianNameOf,
  } = buildExpenseSummary(event, me?.id)
  const toggleBreakdown = (key: string) => setOpenBreakdowns((open) => toggleInSet(open, key))

  // One ink, by decision: the sign and the fine print carry the meaning. This
  // deliberately overrides the pos/warn semantic pair for this surface — green
  // and red balances at display scale are the convention this world refuses.
  const toneOf = (cents: number) => (cents === 0 ? 'text-muted' : 'text-ink')

  return (
    <div className="space-y-6">
      <section className="-mx-4 border-y-2 border-rail bg-surface px-4 pb-4 pt-5 md:mx-0">
        {mine ? (
          <>
            <button
              type="button"
              onClick={() => setUnfolded((v) => !v)}
              aria-expanded={unfolded}
              className="block w-full text-left"
            >
              <span className={`price block text-[clamp(4.5rem,24vw,7rem)] ${toneOf(myCarried)}`}>
                {formatSignedMoney(myCarried)}
              </span>
              <span className="fineprint mt-2 block">
                {t('expenses.summary.youPaid', { amount: formatMoney(mine.spentCents) })}
                {' · '}
                {t('expenses.summary.yourShare', {
                  amount: formatMoney(mine.spentCents - mine.balanceCents),
                })}
                {carriedNames(mine.userId) && (
                  <>
                    {' · '}
                    {t('expenses.summary.includes', { names: carriedNames(mine.userId) })}
                  </>
                )}
                <span className="ml-2 text-brand">
                  {unfolded ? t('expenses.summary.fold') : t('expenses.summary.unfold')}
                </span>
              </span>
            </button>
            {unfolded && (
              <ul className="unfold mt-3 space-y-1 pl-3">
                <li className="fineprint">
                  {t('expenses.summary.inThis', { count: myExpenses.length })}
                </li>
                {myExpenses.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {e.description}{' '}
                      <span className="text-muted">
                        {t('expenses.summary.paidBy', { name: nameOf(e.paidBy) })}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">{formatMoney(e.cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <span className="price block text-[clamp(3rem,16vw,5rem)]">
            {formatMoney(result.totalCents)}
          </span>
        )}

        <div className="rail mt-4" />

        <ul className="mt-3">
          {shown.map((b) => (
            <li
              key={b.userId}
              className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <span className="flex min-w-0 flex-1 flex-col truncate text-sm text-ink">
                <span className="truncate">
                  {nameOf(b.userId)}
                  <YouLabel userId={b.userId} />
                </span>
                {guardianNameOf(b.userId) && (
                  <span className="fineprint">
                    {t('participants.guardianOf', { name: guardianNameOf(b.userId) })}
                  </span>
                )}
                {householdOf[b.userId] && (
                  <span className="fineprint">
                    {t('participants.householdOf', { name: householdOf[b.userId] })}
                  </span>
                )}
              </span>
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted">
                {formatMoney(b.spentCents)}
              </span>
              <span
                className={`w-24 shrink-0 text-right text-sm font-semibold tabular-nums ${toneOf(b.balanceCents)}`}
              >
                {formatSignedMoney(b.balanceCents)}
              </span>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <p className="fineprint mt-3">
            {t('expenses.summary.zeroHidden', { count: hiddenCount })}
          </p>
        )}
        <p className="fineprint mt-3">
          {t('expenses.summary.total')} {formatMoney(result.totalCents)}
        </p>
      </section>

      <section>
        <h3 className="fineprint mb-2">{t('expenses.summary.transfers')}</h3>
        {allSquare && (
          <p className="mb-3 inline-block bg-promo px-3 py-1 text-sm font-bold uppercase tracking-wide text-promo-fg">
            {t('expenses.summary.allSquare')}
          </p>
        )}
        {result.transfers.length === 0 ? (
          <p className="text-sm text-muted">{t('expenses.summary.nobodyOwes')}</p>
        ) : (
          <ul className="space-y-1">
            {result.transfers.map((tr, i) => {
              const settled = isSettled(tr.from, tr.to)
              const households = householdSides(tr)
              const breakdownKey = `${tr.from}:${tr.to}`
              const breakdownOpen = openBreakdowns.has(breakdownKey)
              return (
                <li key={i}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={settled}
                      onChange={() => toggleSettled(tr.from, tr.to)}
                      className="size-5 shrink-0 accent-pos"
                      aria-label={t('expenses.summary.markPaid')}
                    />
                    <span className={settled ? 'text-muted line-through' : 'text-ink'}>
                      {t('expenses.summary.transferLine', {
                        from: partyName(tr.from),
                        amount: formatMoney(tr.cents),
                        to: partyName(tr.to),
                      })}
                      {!householdRepresentedBy(tr.from) && carriedNames(tr.from) && (
                        <span className="text-muted">
                          {' '}
                          ({t('expenses.summary.includes', { names: carriedNames(tr.from) })})
                        </span>
                      )}
                    </span>
                  </label>
                  {households.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleBreakdown(breakdownKey)}
                        aria-expanded={breakdownOpen}
                        className="fineprint ml-8 inline-flex min-h-11 items-center text-brand"
                      >
                        {breakdownOpen
                          ? t('expenses.summary.householdHide')
                          : t('expenses.summary.householdBreakdown')}
                      </button>
                      {breakdownOpen &&
                        households.map((household) => (
                          <ul key={household} className="unfold mb-2 ml-8 space-y-1">
                            {householdMembers(household).map((u) => (
                              <li key={u.id} className="text-sm text-muted">
                                {t('expenses.summary.householdMember', {
                                  name: u.name,
                                  amount: formatSignedMoney(memberBalance(u.id)),
                                })}
                                {carriedNames(u.id) && (
                                  <>
                                    {' '}
                                    ({t('expenses.summary.includes', { names: carriedNames(u.id) })}
                                    )
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        ))}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
