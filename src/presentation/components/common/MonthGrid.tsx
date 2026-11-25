import type { ReactNode } from 'react'
import {
  monthDays,
  monthOf,
  monthTitle,
  shiftMonth,
  weekdayNames,
} from '@/presentation/utils/calendarMonth'
import { IconChevron } from '@/presentation/components/common/icons'

/**
 * A month laid out Monday-first. It knows nothing about votes or options: every
 * cell is whatever `renderDay` returns, so both the "pick the dates" calendar
 * and the "vote" calendar share this one layout.
 */
export function MonthGrid(props: {
  month: string
  locale: string
  onMonthChange: (month: string) => void
  renderDay: (iso: string, inMonth: boolean) => ReactNode
  labels?: { prev: string; next: string }
}) {
  const { month, locale, onMonthChange, renderDay, labels } = props
  const days = monthDays(month)
  const title = monthTitle(month, locale)

  return (
    <div className="border border-border bg-surface p-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label={labels?.prev ?? 'previous month'}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
        >
          <IconChevron dir="left" className="size-4" />
        </button>
        <span className="text-sm font-medium capitalize text-ink">{title}</span>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label={labels?.next ?? 'next month'}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
        >
          <IconChevron dir="right" className="size-4" />
        </button>
      </div>

      <div role="grid" className="mt-1">
        <div role="row" className="grid grid-cols-7">
          {weekdayNames(locale).map((name) => (
            <div key={name} role="columnheader" className="fineprint p-1 text-center">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((iso) => (
            <div key={iso} role="gridcell" className="min-h-11">
              {renderDay(iso, monthOf(iso) === month)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
