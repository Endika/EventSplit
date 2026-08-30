import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MAX_OPTIONS,
  MAX_SPAN_DAYS,
  coversDay,
  makeRange,
  optionKey,
  sortOptions,
  spanDays,
  type DayOption,
} from '@/domain/value-objects/DayOption'
import { monthOf } from '@/presentation/utils/calendarMonth'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'
import { MonthGrid } from '@/presentation/components/common/MonthGrid'
import { Button } from '@/presentation/components/common/Button'
import { Modal } from '@/presentation/components/common/Modal'

function todayIso(): string {
  const now = new Date()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/**
 * Picks which days and stretches go up for a vote. Tapping adds or drops a
 * single day; with "stretch" on, two taps make one option out of everything in
 * between. Nothing is written until Save: one confirmation is one write, and an
 * event is a single blob every connected client re-downloads.
 */
export function DayOptionsCalendar(props: {
  options: DayOption[]
  votesByKey: Record<string, number>
  onCommit: (next: DayOption[]) => void
  busy: boolean
}) {
  const { options, votesByKey, onCommit, busy } = props
  const { t, i18n } = useTranslation()

  const [selection, setSelection] = useState<DayOption[]>(options)
  const [month, setMonth] = useState(() => monthOf(options[0]?.start ?? todayIso()))
  const [rangeMode, setRangeMode] = useState(false)
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<DayOption | null>(null)
  const [chooseRemoval, setChooseRemoval] = useState<DayOption[] | null>(null)

  const full = selection.length >= MAX_OPTIONS
  const changed =
    selection.length !== options.length ||
    selection.some((o, i) => optionKey(o) !== optionKey(options[i] ?? o))

  function add(option: DayOption) {
    if (full) {
      setWarning(t('availability.optionsFull'))
      return
    }
    if (selection.some((o) => optionKey(o) === optionKey(option))) return
    setWarning(null)
    setSelection((prev) => sortOptions([...prev, option]))
  }

  function drop(option: DayOption) {
    setSelection((prev) => prev.filter((o) => optionKey(o) !== optionKey(option)))
    setWarning(null)
  }

  function requestDrop(option: DayOption) {
    if ((votesByKey[optionKey(option)] ?? 0) > 0) {
      setToRemove(option)
      return
    }
    drop(option)
  }

  function handleDay(iso: string) {
    if (rangeMode) {
      if (rangeStart === null) {
        setRangeStart(iso)
        return
      }
      const range = makeRange(rangeStart, iso)
      setRangeStart(null)
      setRangeMode(false)
      if (spanDays(range) > MAX_SPAN_DAYS) {
        setWarning(t('availability.rangeTooLong'))
        return
      }
      add(range)
      return
    }

    const covering = selection.filter((o) => coversDay(o, iso))
    if (covering.length === 0) {
      add({ start: iso, end: iso, note: null })
      return
    }
    if (covering.length === 1 && covering[0]) {
      requestDrop(covering[0])
      return
    }
    setChooseRemoval(covering)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={rangeMode ? 'primary' : 'secondary'}
          onClick={() => {
            setRangeMode((on) => !on)
            setRangeStart(null)
            setWarning(null)
          }}
          aria-pressed={rangeMode}
        >
          {t('availability.rangeMode')}
        </Button>
        {rangeMode && <span className="text-xs text-muted">{t('availability.rangeModeHint')}</span>}
      </div>

      <MonthGrid
        month={month}
        locale={i18n.language}
        onMonthChange={setMonth}
        labels={{ prev: t('availability.prevMonth'), next: t('availability.nextMonth') }}
        renderDay={(iso, inMonth) => {
          const covering = selection.filter((o) => coversDay(o, iso))
          const picked = covering.length > 0
          const isRangeStart = rangeStart === iso
          const blocked = !picked && full && !rangeMode
          return (
            <button
              type="button"
              data-iso={iso}
              data-picked={picked}
              onClick={() => handleDay(iso)}
              disabled={busy || blocked}
              aria-pressed={picked}
              aria-label={new Intl.DateTimeFormat(i18n.language, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(iso + 'T00:00:00'))}
              className={[
                'flex h-full min-h-11 w-full items-center justify-center rounded-lg text-sm',
                inMonth ? 'text-ink' : 'text-muted/50',
                picked ? 'bg-brand-soft font-semibold text-brand-soft-fg' : 'hover:bg-elevated',
                isRangeStart ? 'ring-2 ring-brand' : '',
                blocked ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              {Number(iso.slice(-2))}
            </button>
          )
        }}
      />

      {warning && <p className="text-sm text-danger">{warning}</p>}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => onCommit(selection)}
          disabled={busy || !changed || selection.length === 0}
        >
          {t('availability.saveOptions')}
        </Button>
        <span className="text-xs text-muted">
          {selection.length}/{MAX_OPTIONS}
        </span>
      </div>

      {toRemove && (
        <Modal
          open
          title={t('availability.removeDayTitle')}
          dismissable={!busy}
          onClose={() => setToRemove(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              {t('availability.removeDayConfirm', {
                date: formatOptionLabel(toRemove, i18n.language),
              })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setToRemove(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  drop(toRemove)
                  setToRemove(null)
                }}
              >
                {t('availability.removeDayYes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {chooseRemoval && (
        <Modal
          open
          title={t('availability.pickOptionToRemove')}
          dismissable
          onClose={() => setChooseRemoval(null)}
        >
          <ul className="space-y-2">
            {chooseRemoval.map((o) => (
              <li key={optionKey(o)}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setChooseRemoval(null)
                    requestDrop(o)
                  }}
                >
                  {formatOptionLabel(o, i18n.language)}
                </Button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}
