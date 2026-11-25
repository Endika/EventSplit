/** 'hace 5 minutos' within a day, a dated stamp after that; an unreadable date comes back as given. */
export function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - then) / 1000)
  try {
    if (diff < 86400) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      if (diff < 60) return rtf.format(-diff, 'second')
      if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute')
      return rtf.format(-Math.floor(diff / 3600), 'hour')
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}
