import { optionKey, type DayOption } from '@/domain/value-objects/DayOption'

/**
 * A day option as a reader sees it: 'vie 5 jun' for a single day, '12–14 jun'
 * for a stretch inside one month, '30 jun – 2 jul' when it crosses one. A table
 * header has to be read at a glance, so two full dates is too much.
 */
export function formatOptionLabel(o: DayOption, locale: string): string {
  try {
    const start = new Date(o.start + 'T00:00:00')
    const end = new Date(o.end + 'T00:00:00')
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return optionKey(o)

    if (o.start === o.end) {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(start)
    }

    const dayOnly = new Intl.DateTimeFormat(locale, { day: 'numeric' })
    const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    const sameMonth =
      start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()

    return sameMonth
      ? `${dayOnly.format(start)}–${dayMonth.format(end)}`
      : `${dayMonth.format(start)} – ${dayMonth.format(end)}`
  } catch {
    return optionKey(o)
  }
}
