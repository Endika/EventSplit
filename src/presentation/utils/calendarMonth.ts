import { atNoon, optionsCoveringDay, toIso, type DayOption } from '@/domain/value-objects/DayOption'
import { pickAt } from '@/presentation/utils/collections'

/** Month-grid arithmetic: kept out of the component file so fast refresh works. */
const MS_PER_DAY = 86_400_000
/** Cells in the grid: six weeks, so the height never jumps between months. */
const CELLS = 42

export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

export const todayIso = (): string => toIso(new Date())

/** The month a calendar opens on: the first option's, else the current one. */
export const initialMonth = (options: readonly DayOption[]): string =>
  monthOf(options[0]?.start ?? todayIso())

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = [Number(month.slice(0, 4)), Number(month.slice(5, 7))]
  const d = new Date(y, m - 1 + delta, 1, 12)
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`
}

/** The 42 ISO days a month grid shows, Monday first, padded from both sides. */
export function monthDays(month: string): string[] {
  const first = atNoon(`${month}-01`)
  // getDay() is 0 for Sunday; we want Monday at 0.
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first.getTime() - offset * MS_PER_DAY)
  return Array.from({ length: CELLS }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return toIso(d)
  })
}

export function weekdayNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2026-06-01 is a Monday: a reference week to name the columns.
  return Array.from({ length: 7 }, (_, i) => {
    const d = atNoon('2026-06-01')
    d.setDate(d.getDate() + i)
    return fmt.format(d)
  })
}

export function monthTitle(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    atNoon(`${month}-01`),
  )
}

/** '5 de junio de 2026': the full date a day cell announces to a screen reader. */
export function longDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(atNoon(iso))
}

/** Where a day sits in the option painted over it, so a stretch reads as one band. */
export function bandPosition(
  option: DayOption | undefined,
  iso: string,
): 'none' | 'single' | 'start' | 'end' | 'middle' {
  if (!option) return 'none'
  if (option.start === option.end) return 'single'
  if (iso === option.start) return 'start'
  return iso === option.end ? 'end' : 'middle'
}

export const optionsCovering = (options: DayOption[], iso: string): DayOption[] =>
  pickAt(options, optionsCoveringDay(options, iso))
