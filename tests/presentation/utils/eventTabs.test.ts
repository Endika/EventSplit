import { describe, it, expect } from 'vitest'
import { barTabKeys, defaultTabForStage, swipeStep } from '@/presentation/utils/eventTabs'

describe('defaultTabForStage', () => {
  it.each([
    ['shopping', 'purchases'],
    ['anything else', 'participants'],
  ])('%s opens %s', (stage, tab) => {
    expect(defaultTabForStage(stage)).toBe(tab)
  })
})

describe('barTabKeys', () => {
  it.each([
    ['expenses', ['expenses', 'participants', 'purchases', 'availability']],
    ['doodle', ['availability', 'participants', 'purchases', 'expenses']],
  ])('%s leads the bar with its own tab, four in all and no repeats', (stage, expected) => {
    expect(barTabKeys(stage)).toEqual(expected)
  })
})

describe('swipeStep', () => {
  it.each([
    [70, 0, -1],
    [69, 0, 0],
    [-180, 100, 1],
    [-180, 101, 0],
  ])('dx %i, dy %i moves %i tabs', (dx, dy, step) => {
    expect(swipeStep(dx, dy)).toBe(step)
  })
})
