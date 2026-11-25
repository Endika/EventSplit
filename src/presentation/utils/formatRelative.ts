const MINUTE = 60
const HOUR = 3600
const DAY = 86400

/**
 * 'hace 5 minutos' for anything newer than `relativeFor` seconds (a day by default),
 * a dated stamp after that; an unreadable date comes back as given.
 */
export function formatRelative(
  iso: string,
  locale: string,
  {
    relativeFor = DAY,
    dateFormat = { dateStyle: 'medium', timeStyle: 'short' },
  }: { relativeFor?: number; dateFormat?: Intl.DateTimeFormatOptions } = {},
): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  try {
    if (diff < relativeFor) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      if (diff < MINUTE) return rtf.format(-diff, 'second')
      if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute')
      if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour')
      return rtf.format(-Math.floor(diff / DAY), 'day')
    }
    return new Intl.DateTimeFormat(locale, dateFormat).format(new Date(iso))
  } catch {
    return iso
  }
}
