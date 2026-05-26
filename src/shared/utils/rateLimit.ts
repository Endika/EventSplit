const KEY = 'eventsplit.writes'
const WINDOW_MS = 60_000
const MAX_WRITES = 60

/**
 * Soft client-side write throttle: at most MAX_WRITES per device per minute.
 * Defeatable (it's localStorage) but cheap protection against UX-bot loops.
 * Returns true if the write is allowed (and records it), false if over budget.
 */
export function allowWrite(now: number = Date.now()): boolean {
  let times: number[] = []
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) times = JSON.parse(raw) as number[]
  } catch {
    times = []
  }
  const recent = times.filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_WRITES) {
    localStorage.setItem(KEY, JSON.stringify(recent))
    return false
  }
  recent.push(now)
  localStorage.setItem(KEY, JSON.stringify(recent))
  return true
}
