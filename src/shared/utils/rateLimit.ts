const KEY = 'eventsplit.writes'
const WINDOW_MS = 60_000
const MAX_WRITES = 60

/**
 * Soft client-side write throttle: at most MAX_WRITES per device per minute.
 * Defeatable (it's localStorage) but cheap protection against UX-bot loops.
 * Returns true if the write is allowed (and records it), false if over budget.
 */
function storedWrites(): number[] {
  try {
    // Stryker disable next-line StringLiteral: any other fallback fails to parse and lands on the same empty list
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[]
  } catch {
    // Stryker disable next-line ArrayDeclaration: a placeholder entry is not a timestamp and the window filter drops it
    return []
  }
}

export function allowWrite(now: number = Date.now()): boolean {
  const recent = storedWrites().filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_WRITES) {
    localStorage.setItem(KEY, JSON.stringify(recent))
    return false
  }
  recent.push(now)
  localStorage.setItem(KEY, JSON.stringify(recent))
  return true
}
