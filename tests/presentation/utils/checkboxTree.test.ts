import { describe, it, expect } from 'vitest'
import { parentState, toggleGroup, toggleOne } from '@/presentation/utils/checkboxTree'

describe('parentState', () => {
  it('is on when every child is on', () => {
    expect(parentState([true, true])).toBe('on')
  })
  it('is off when no child is on', () => {
    expect(parentState([false, false])).toBe('off')
  })
  it('is mixed in between', () => {
    expect(parentState([true, false])).toBe('mixed')
  })
  it('is off with no children', () => {
    expect(parentState([])).toBe('off')
  })
})

describe('toggleGroup', () => {
  it('ticking a group ticks every item under it', () => {
    expect(toggleGroup(['a', 'b'], [], true)).toEqual(['a', 'b'])
  })
  it('unticking a group leaves the rest of the selection alone', () => {
    expect(toggleGroup(['a', 'b'], ['a', 'b', 'c'], false)).toEqual(['c'])
  })
  it('does not duplicate what is already selected', () => {
    expect(toggleGroup(['a', 'b'], ['a'], true)).toEqual(['a', 'b'])
  })
})

describe('toggleOne', () => {
  it('adds and removes a single id', () => {
    expect(toggleOne('a', [])).toEqual(['a'])
    expect(toggleOne('a', ['a', 'b'])).toEqual(['b'])
  })
})
