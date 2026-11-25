import { describe, it, expect } from 'vitest'
import { tabWrapTarget } from '@/presentation/utils/focusTrap'

describe('tabWrapTarget', () => {
  it.each([
    [[], 'x', false, 'panel'],
    [['a', 'b'], 'panel', true, 'b'],
    [['a', 'b'], 'b', true, null],
    [['a', 'b'], 'a', false, null],
  ])('%j from %s with shift %s -> %s', (controls, active, shift, expected) => {
    expect(tabWrapTarget(controls, active, 'panel', shift)).toBe(expected)
  })
})
