const MINUTE = 60
const HOUR = 3600
const DAY = 86400
const WEEK = 604800

/** Coarse English "5m ago" within a week, a dated stamp after that; an unreadable date comes back as given. */
export function formatRecentActivity(iso: string, locale: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}
