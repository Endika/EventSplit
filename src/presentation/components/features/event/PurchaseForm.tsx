import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import type { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import type { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import type { EditBroughtItemHandler } from '@/application/handlers/EditBroughtItemHandler'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { inferPurchaseDays, defaultConsumptionDays } from '@/domain/services/inferPurchaseDays'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { Modal } from '@/presentation/components/common/Modal'
import { IconAlert, IconLeaf } from '@/presentation/components/common/icons'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { InfoChip } from '@/presentation/components/common/InfoChip'
import { useOnlineStatus } from '@/presentation/context/SyncContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { AllergyChecker, type AllergyMatch } from '@/domain/services/AllergyChecker'
import { AllergyAlertModal } from './AllergyAlertModal'
import { reportError } from '@/shared/utils/reportError'
import { friendlyError } from '@/presentation/utils/friendlyError'
import { parseDecimal } from '@/shared/utils/parseDecimal'
import { SHARED_UNIT } from '@/domain/entities/Purchase'
import { SELECTABLE_UNITS as UNITS } from '@/presentation/utils/units'
import { canBeAssigned, canBring } from '@/domain/services/participantRoles'
import {
  allConsumers,
  allergenLabel,
  buyConsumers,
  existingGroups,
  existingSubgroups,
  groupFields,
  initialConsumers,
  isSubmitBlocked,
  isValidConsumption,
  toggleConsumer as toggleConsumerIn,
  totalPreview,
} from '@/presentation/utils/purchaseForm'
import { isPositiveNumber } from '@/presentation/utils/numbers'
import { userLabel } from '@/presentation/utils/userLabel'

export function PurchaseForm({
  onDone,
  purchase,
  onDirtyChange,
}: {
  onDone: () => void
  purchase?: PurchaseSnapshot
  onDirtyChange?: (dirty: boolean) => void
}) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const online = useOnlineStatus()
  const { guardedExecute } = useWriteGuard()

  const inferredDays = purchase ? inferPurchaseDays(purchase) : defaultConsumptionDays(event)

  const [mode, setMode] = useState<'buy' | 'bring'>(purchase ? (purchase.kind ?? 'buy') : 'buy')
  const [item, setItem] = useState(purchase?.item ?? '')
  const [quantity, _setQuantity] = useState(purchase?.quantity ?? 1)
  const [bringQtyStr, setBringQtyStr] = useState(String(purchase?.quantity ?? 1))
  const [singleQtyStr, setSingleQtyStr] = useState(String(purchase?.quantity ?? 1))
  const [broughtBy, setBroughtBy] = useState<string | null>(purchase?.assignedTo ?? me?.id ?? null)
  const [unit, setUnit] = useState<string>(purchase?.unit ?? 'units')
  const [dailyStr, setDailyStr] = useState(String(purchase?.dailyConsumption ?? 1))
  const dailyConsumption = parseDecimal(dailyStr)
  // Shared staples (unit "single"): fixed quantity, no per-person/day calc.
  const isSingle = mode === 'buy' && unit === SHARED_UNIT
  const [days, setDays] = useState(inferredDays)
  const [consumers, setConsumers] = useState<Record<string, number>>(() =>
    initialConsumers(event?.users ?? [], purchase),
  )
  const [assignedTo, setAssignedTo] = useState<string | null>(purchase?.assignedTo ?? null)
  const [group, setGroup] = useState(purchase?.group ?? '')
  const [subgroup, setSubgroup] = useState(purchase?.subgroup ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingMatches, setPendingMatches] = useState<AllergyMatch[] | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const rootRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const currentSnapshot = JSON.stringify({
    mode,
    item,
    quantity,
    unit,
    dailyStr,
    days,
    consumers,
    assignedTo,
    group,
    subgroup,
    bringQtyStr,
    broughtBy,
    singleQtyStr,
  })
  const [initialSnapshot] = useState(currentSnapshot)
  const isDirty = initialSnapshot !== currentSnapshot

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  if (!event || !me) return null

  const preview = totalPreview(consumers, dailyConsumption, days)
  const groupSuggestions = existingGroups(event.purchases)
  const subgroupSuggestions = existingSubgroups(event.purchases, group.trim())

  const selectAllConsumers = () => setConsumers(allConsumers(event?.users ?? []))
  const selectNoConsumers = () => setConsumers({})
  const toggleConsumer = (id: string) =>
    setConsumers((prev) => toggleConsumerIn(prev, id, event?.users ?? []))

  function setMultiplier(id: string, m: number) {
    setConsumers((prev) => ({ ...prev, [id]: m }))
  }

  function switchMode(next: 'buy' | 'bring') {
    // A brought item has no consumers; seed everyone when flipping it to buy.
    if (next === 'buy' && Object.keys(consumers).length === 0) selectAllConsumers()
    setMode(next)
  }

  function doSave() {
    if (!event || !me) return
    guardedExecute(
      async () => {
        setBusy(true)
        setError(null)
        try {
          const failInvalid = () => {
            setError(t('purchases.form.invalidQuantity'))
            setBusy(false)
          }
          if (mode === 'bring') {
            const qty = parseDecimal(bringQtyStr)
            if (!isPositiveNumber(qty)) return failInvalid()
            const fields = { item, quantity: qty, unit, ...groupFields(group, subgroup), broughtBy }
            const result = purchase
              ? await container.resolve<EditBroughtItemHandler>('editBroughtItem').execute({
                  eventId: event.id,
                  purchaseId: purchase.id,
                  editedBy: me.id,
                  ...fields,
                })
              : await container
                  .resolve<AddBroughtItemHandler>('addBroughtItem')
                  .execute({ eventId: event.id, createdBy: me.id, ...fields })
            setEvent(result.event, result.version)
            setPendingMatches(null)
            onDone()
            return
          }
          // Shared-staple items use a fixed quantity and skip the per-person calc;
          // pass valid placeholders for the calc fields the domain still validates.
          const buyQuantity = isSingle ? parseDecimal(singleQtyStr) : quantity
          const valid = isSingle
            ? isPositiveNumber(buyQuantity)
            : isValidConsumption(dailyConsumption, days)
          if (!valid) return failInvalid()
          const fields = {
            item,
            quantity: buyQuantity,
            unit,
            dailyConsumption: isSingle ? 1 : dailyConsumption,
            consumers: buyConsumers(isSingle, event.users, consumers),
            days: isSingle ? 1 : days,
            assignedTo,
            ...groupFields(group, subgroup),
          }
          const result = purchase
            ? await container
                .resolve<EditPurchaseHandler>('editPurchase')
                .execute({ eventId: event.id, purchaseId: purchase.id, editedBy: me.id, ...fields })
            : await container
                .resolve<AddPurchaseHandler>('addPurchase')
                .execute({ eventId: event.id, createdBy: me.id, ...fields })
          setEvent(result.event, result.version)
          setPendingMatches(null)
          onDone()
        } catch (err) {
          reportError('PurchaseForm', err)
          setError(friendlyError(err, t))
        } finally {
          setBusy(false)
        }
      },
      (err) => {
        reportError('PurchaseForm', err)
        setError(friendlyError(err, t))
        setBusy(false)
      },
    )
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
          displayName: userLabel(u),
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
          onContinue={() => {
            doSave()
          }}
          onCancel={() => {
            setPendingMatches(null)
            setItem('')
          }}
        />
      )}
      <form
        ref={rootRef}
        onSubmit={submit}
        className="space-y-3 border-2 border-rail bg-surface p-4"
      >
        <div className="flex border border-border">
          <button
            type="button"
            onClick={() => switchMode('buy')}
            className={`flex min-h-11 flex-1 items-center justify-center px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] transition ${
              mode === 'buy'
                ? 'bg-brand text-white dark:text-bg'
                : 'bg-elevated text-ink hover:bg-surface'
            }`}
          >
            {t('purchases.form.modeBuy')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('bring')}
            className={`flex min-h-11 flex-1 items-center justify-center px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] transition ${
              mode === 'bring'
                ? 'bg-brand text-white dark:text-bg'
                : 'bg-elevated text-ink hover:bg-surface'
            }`}
          >
            {t('purchases.form.modeBring')}
          </button>
        </div>
        {purchase && (
          <p className="text-sm font-medium text-ink">
            {t('purchases.form.editTitle')}: <span className="text-ink">{purchase.item}</span>
          </p>
        )}
        <label className="block text-sm text-ink">
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
        <label className="block text-sm text-ink">
          {t('purchases.form.group')}
          <input
            className="mt-1 block min-h-11 w-full border border-border bg-surface px-3 py-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
            list="group-suggestions"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            maxLength={50}
            placeholder={t('purchases.form.groupPlaceholder')}
          />
          <datalist id="group-suggestions">
            {groupSuggestions.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </label>
        {group.trim() !== '' && (
          <label className="block text-sm text-ink">
            {t('purchases.form.subgroup')}
            <input
              className="mt-1 block min-h-11 w-full border border-border bg-surface px-3 py-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
              list="subgroup-suggestions"
              value={subgroup}
              onChange={(e) => setSubgroup(e.target.value)}
              maxLength={50}
              placeholder={t('purchases.form.subgroupPlaceholder')}
            />
            <datalist id="subgroup-suggestions">
              {subgroupSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        )}
        {mode === 'bring' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-ink">
                {t('purchases.form.quantity')}
                <Input
                  className="mt-1"
                  type="text"
                  inputMode="decimal"
                  value={bringQtyStr}
                  onChange={(e) => setBringQtyStr(e.target.value)}
                />
              </label>
              <label className="block text-sm text-ink">
                {t('purchases.form.unit')}
                <select
                  className="mt-1 block min-h-11 w-full border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {!UNITS.includes(unit as (typeof UNITS)[number]) && unit && (
                    <option value={unit}>{unit}</option>
                  )}
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`purchases.form.units.${u}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm text-ink">
              {t('purchases.form.broughtBy')}
              <select
                className="mt-1 block min-h-11 w-full border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                value={broughtBy ?? ''}
                onChange={(e) => setBroughtBy(e.target.value || null)}
              >
                <option value="">{t('purchases.form.broughtByNobody')}</option>
                {event.users
                  .filter((u) => canBring(u.kind))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
        {mode === 'buy' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-ink">
                {isSingle ? t('purchases.form.quantity') : t('purchases.form.dailyConsumption')}
                <Input
                  className="mt-1"
                  type="text"
                  inputMode="decimal"
                  value={isSingle ? singleQtyStr : dailyStr}
                  onChange={(e) =>
                    isSingle ? setSingleQtyStr(e.target.value) : setDailyStr(e.target.value)
                  }
                />
              </label>
              <label className="block text-sm text-ink">
                {t('purchases.form.unit')}
                <select
                  className="mt-1 block min-h-11 w-full border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {!UNITS.includes(unit as (typeof UNITS)[number]) && unit && (
                    <option value={unit}>{unit}</option>
                  )}
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`purchases.form.units.${u}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {isSingle && (
              <p className="-mt-1 text-xs text-muted">{t('purchases.form.singleHelp')}</p>
            )}
            {!isSingle && (
              <>
                <p className="-mt-1 text-xs text-muted">
                  {t('purchases.form.dailyConsumptionHelp')}
                </p>
                <label className="block text-sm text-ink">
                  {t('purchases.form.days')}
                  <Input
                    className="mt-1"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value, 10))}
                  />
                </label>
                <p className="-mt-1 text-xs text-muted">{t('purchases.form.daysHelp')}</p>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{t('purchases.form.consumers')}</p>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllConsumers}
                        className="inline-flex size-11 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                      >
                        {t('purchases.form.selectAll')}
                      </button>
                      <button
                        type="button"
                        onClick={selectNoConsumers}
                        className="inline-flex size-11 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
                      >
                        {t('purchases.form.selectNone')}
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {event.users.map((u) => {
                      const selected = consumers[u.id] !== undefined
                      const m = consumers[u.id] ?? 1
                      const allergens = u.allergies ?? []
                      const allergyMatchesItem =
                        allergens.length > 0 &&
                        AllergyChecker.findMatches({
                          item,
                          users: [{ userId: u.id, displayName: '', allergies: allergens }],
                        }).length > 0
                      return (
                        <li key={u.id} className="flex items-center gap-2 text-sm">
                          <label className="flex cursor-pointer items-center gap-2 py-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleConsumer(u.id)}
                            />
                            <span>{userLabel(u)}</span>
                          </label>
                          <YouLabel userId={u.id} />
                          {allergens.length > 0 && (
                            <InfoChip
                              icon={<IconAlert className="size-4" />}
                              tone={allergyMatchesItem ? 'rose' : 'amber'}
                              label={t('purchases.form.allergyChip', {
                                list: allergens
                                  .map((a) => allergenLabel(a, t(`allergens.${a.name}`)))
                                  .join(', '),
                              })}
                            />
                          )}
                          {u.dietary && (
                            <InfoChip
                              icon={<IconLeaf className="size-4" />}
                              tone="slate"
                              label={t('purchases.form.dietaryChip', { text: u.dietary })}
                            />
                          )}
                          {selected && (
                            <select
                              className="ml-auto min-h-11 max-w-[9rem] truncate border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                              value={m}
                              onChange={(e) => setMultiplier(u.id, parseFloat(e.target.value))}
                            >
                              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5].map((v) => (
                                <option key={v} value={v}>
                                  ×{v}
                                </option>
                              ))}
                            </select>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )}
            <label className="block text-sm text-ink">
              {t('purchases.form.assignedTo')}
              <select
                className="mt-1 block min-h-11 w-full border border-border bg-surface px-2 text-base text-ink sm:text-sm"
                value={assignedTo ?? ''}
                onChange={(e) => setAssignedTo(e.target.value || null)}
              >
                <option value="">{t('purchases.form.assignedNobody')}</option>
                {event.users
                  .filter((u) => canBeAssigned(u.kind))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
              </select>
            </label>
            {!isSingle && preview !== null && (
              <div className="border-l-2 border-brand bg-brand-soft px-3 py-2 text-sm text-brand-soft-fg">
                {t('purchases.form.totalPreview', {
                  n: preview,
                  unit: UNITS.includes(unit as (typeof UNITS)[number])
                    ? t(`purchases.form.units.${unit}`)
                    : unit,
                })}
              </div>
            )}
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        {confirmCancel && (
          <Modal
            open
            title={t('common.unsavedTitle')}
            dismissable
            onClose={() => setConfirmCancel(false)}
          >
            <div className="space-y-3">
              <p className="text-sm text-ink">{t('common.unsavedBody')}</p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setConfirmCancel(false)}>
                  {t('common.keepEditing')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmCancel(false)
                    onDone()
                  }}
                >
                  {t('common.discard')}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex gap-2 border-t-2 border-rail bg-surface px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => (isDirty ? setConfirmCancel(true) : onDone())}
            disabled={busy}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            loading={busy}
            disabled={isSubmitBlocked({
              busy,
              online,
              isEdit: !!purchase,
              item,
              mode,
              isSingle,
              consumerCount: Object.keys(consumers).length,
            })}
          >
            {purchase ? t('purchases.form.update') : t('purchases.form.submit')}
          </Button>
        </div>
      </form>
    </>
  )
}
