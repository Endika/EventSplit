/**
 * An option people vote on: a single day (start === end) or a stretch of days,
 * with an optional free note ("puente de la Almudena", "casa rural 120 €").
 *
 * The note is deliberately outside {@link optionKey}: votes are keyed by the
 * dates alone, so editing a note can never move or lose a vote.
 */
export type DayOption = { start: string; end: string; note: string | null }

export const MAX_OPTIONS = 31
export const MAX_SPAN_DAYS = 31
export const MAX_NOTE_LEN = 80

const ISO = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

/** Local noon: immune to the daylight-saving jump when adding days. */
function atNoon(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

function toIso(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function optionKey(o: DayOption): string {
  return `${o.start}..${o.end}`
}

export function parseOptionKey(key: string): DayOption | null {
  const parts = key.split('..')
  const [start, end] = [parts[0] ?? '', parts[1] ?? '']
  if (!ISO.test(start) || !ISO.test(end)) return null
  return { start, end, note: null }
}

export function spanDays(o: DayOption): number {
  const diff = atNoon(o.end).getTime() - atNoon(o.start).getTime()
  return Math.round(diff / MS_PER_DAY) + 1
}

export function normalizeNote(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  return trimmed ? trimmed.slice(0, MAX_NOTE_LEN) : null
}

export function isValidOption(o: DayOption): boolean {
  if (!ISO.test(o.start) || !ISO.test(o.end)) return false
  if (Number.isNaN(atNoon(o.start).getTime()) || Number.isNaN(atNoon(o.end).getTime())) return false
  if (o.note !== null && (typeof o.note !== 'string' || o.note.length > MAX_NOTE_LEN)) return false
  if (o.end < o.start) return false
  return spanDays(o) <= MAX_SPAN_DAYS
}

export function compareOptions(a: DayOption, b: DayOption): number {
  return a.start === b.start ? a.end.localeCompare(b.end) : a.start.localeCompare(b.start)
}

export function sortOptions(os: DayOption[]): DayOption[] {
  return [...os].sort(compareOptions)
}

export function expandDays(o: DayOption): string[] {
  const out: string[] = []
  const cursor = atNoon(o.start)
  const last = atNoon(o.end)
  while (cursor.getTime() <= last.getTime()) {
    out.push(toIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export function coversDay(o: DayOption, iso: string): boolean {
  return iso >= o.start && iso <= o.end
}

export function optionsCoveringDay(os: DayOption[], iso: string): number[] {
  const out: number[] = []
  os.forEach((o, i) => {
    if (coversDay(o, iso)) out.push(i)
  })
  return out
}

export function makeRange(a: string, b: string): DayOption {
  return a <= b ? { start: a, end: b, note: null } : { start: b, end: a, note: null }
}
