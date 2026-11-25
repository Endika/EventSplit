export const TAB_KEYS = [
  'participants',
  'availability',
  'location',
  'purchases',
  'expenses',
  'history',
] as const

export type Tab = (typeof TAB_KEYS)[number]

export function defaultTabForStage(stage: string | undefined): Tab {
  if (stage === 'shopping') return 'purchases'
  if (stage === 'expenses') return 'expenses'
  if (stage === 'doodle') return 'availability'
  return 'participants'
}

/** The phase's own tab first, then the usual suspects, without repeats: always four. */
export const barTabKeys = (stage: string | undefined): Tab[] => [
  ...new Set<Tab>([
    defaultTabForStage(stage),
    'participants',
    'purchases',
    'expenses',
    'availability',
  ]),
]

const SWIPE_MIN_DISTANCE = 70
const SWIPE_HORIZONTAL_BIAS = 1.8

/** +1 for a swipe left (next tab), -1 for right, 0 when too short or mostly vertical. */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return 0
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_BIAS) return 0
  // Stryker disable next-line EqualityOperator: dx is never 0 here, it is at least the minimum distance
  return dx < 0 ? 1 : -1
}
