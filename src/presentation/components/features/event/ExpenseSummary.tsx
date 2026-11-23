import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { ExpenseSplitter } from '@/domain/services/ExpenseSplitter'
import { payingUsers } from '@/domain/services/participantRoles'
import { Money } from '@/domain/value-objects/Money'
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

  function isSettled(from: string, to: string): boolean {
    return event!.settledTransfers.some((s) => s.from === from && s.to === to)
  }

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

  const payers = payingUsers(event.users)
  const payerIds = payers.map((u) => u.id)
  const householdOf: Record<string, string> = Object.fromEntries(
    payers.flatMap((u) => (u.kind === 'adult' && u.household ? [[u.id, u.household]] : [])),
  )
  const live = event.expenses.filter((e) => !e.deleted)
  const result = ExpenseSplitter.compute({
    // Dogs attend but never owe: they are kept out of the split entirely,
    // which also drops their id from any expense that still lists them.
    participantIds: payerIds,
    // Nobody settles up with a child: their balance is carried by the adult
    // answerable for them, so no transfer ever names a minor.
    guardianOf: Object.fromEntries(
      payers.flatMap((u) => (u.guardianId ? [[u.id, u.guardianId]] : [])),
    ),
    householdOf,
    expenses: live.map((e) => ({
      paidBy: e.paidBy,
      amount: Money.fromCents(e.cents),
      splitAmong: e.splitAmong,
    })),
  })
  const nameOf = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'
  const householdMembers = (household: string) =>
    payers.filter((u) => householdOf[u.id] === household)
  // A transfer names the first member of a household, so that is who stands in
  // for the whole group.
  const householdRepresentedBy = (id: string): string | null => {
    const household = householdOf[id]
    return household && householdMembers(household)[0]?.id === id ? household : null
  }
  const partyName = (id: string) => householdRepresentedBy(id) ?? nameOf(id)
  const toggleBreakdown = (key: string) =>
    setOpenBreakdowns((open) => {
      const next = new Set(open)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const mine = result.balances.find((b) => b.userId === me?.id)
  // What this person actually ends up with. Carrying a child means carrying
  // their balance too, so showing the bare personal figure would contradict the
  // settlement list right underneath it.
  const carriedFor = (payerId: string) =>
    result.balances
      .filter((b) => event.users.find((u) => u.id === b.userId)?.guardianId === payerId)
      .reduce((n, b) => n + b.balanceCents, 0)
  const memberBalance = (id: string) =>
    (result.balances.find((b) => b.userId === id)?.balanceCents ?? 0) + carriedFor(id)
  const myCarried = mine ? memberBalance(mine.userId) : 0
  const others = result.balances.filter((b) => b.userId !== mine?.userId)
  // Somebody who paid nothing and owes nothing only lengthens the list, unless
  // they carry a child's balance and so still show up in the transfers.
  const isZero = (b: { userId: string; spentCents: number; balanceCents: number }) =>
    b.spentCents === 0 && b.balanceCents === 0 && carriedFor(b.userId) === 0
  const shown = others.filter((b) => !isZero(b))
  const hiddenCount = others.length - shown.length
  const allSquare =
    result.transfers.length > 0 && result.transfers.every((tr) => isSettled(tr.from, tr.to))

  // The expenses this person is actually in. An empty splitAmong means everyone
  // who pays, so it is resolved against the payer list, the same way the
  // splitter resolves it.
  const myExpenses = me
    ? live.filter((e) => {
        const split = e.splitAmong.filter((id) => payerIds.includes(id))
        return (split.length > 0 ? split : payerIds).includes(me.id)
      })
    : []

  // Whose share this person is carrying, so a bigger figure than their own
  // consumption never looks like an error.
  const carriedNames = (payerId: string): string =>
    event.users
      .filter((u) => u.guardianId === payerId)
      .map((u) => u.name)
      .join(', ')

  const householdSides = (tr: { from: string; to: string }): string[] =>
    [tr.from, tr.to].flatMap((id) => householdRepresentedBy(id) ?? [])

  const guardianNameOf = (userId: string): string => {
    const guardianId = event.users.find((u) => u.id === userId)?.guardianId
    return guardianId ? nameOf(guardianId) : ''
  }

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
