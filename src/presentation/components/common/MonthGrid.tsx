import type { ReactNode } from 'react'
import { monthDays, monthOf, shiftMonth } from '@/presentation/utils/calendarMonth'

function atNoon(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

function weekdayNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2026-06-01 is a Monday: a reference week to name the columns.
  return Array.from({ length: 7 }, (_, i) => {
    const d = atNoon('2026-06-01')
    d.setDate(d.getDate() + i)
    return fmt.format(d)
  })
}

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
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    atNoon(`${month}-01`),
  )

  return (
    <div className="rounded-xl border border-border bg-surface p-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label={labels?.prev ?? 'previous month'}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize text-ink">{title}</span>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label={labels?.next ?? 'next month'}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
        >
          ›
        </button>
      </div>

      <div role="grid" className="mt-1">
        <div role="row" className="grid grid-cols-7">
          {weekdayNames(locale).map((name) => (
            <div
              key={name}
              role="columnheader"
              className="p-1 text-center text-[10px] uppercase text-muted"
            >
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
