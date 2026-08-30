/** Month-grid arithmetic: kept out of the component file so fast refresh works. */
const MS_PER_DAY = 86_400_000
/** Cells in the grid: six weeks, so the height never jumps between months. */
const CELLS = 42

function atNoon(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

function toIso(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

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
