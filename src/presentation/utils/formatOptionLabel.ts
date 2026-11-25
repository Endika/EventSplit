import { atNoon, optionKey, type DayOption } from '@/domain/value-objects/DayOption'

/**
 * A day option as a reader sees it: 'vie 5 jun' for a single day, '12–14 jun'
 * for a stretch inside one month, '30 jun – 2 jul' when it crosses one. A table
 * header has to be read at a glance, so two full dates is too much. A date that
 * cannot be read makes Intl throw, and the label falls back to the option's key.
 */
export function formatOptionLabel(o: DayOption, locale: string): string {
  try {
    const start = atNoon(o.start)
    const end = atNoon(o.end)

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
