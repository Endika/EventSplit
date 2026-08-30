import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAvailabilityView } from '@/presentation/hooks/useAvailabilityView'

describe('useAvailabilityView', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('defaults to the calendar and remembers the choice', () => {
    const { result } = renderHook(() => useAvailabilityView())
    expect(result.current[0]).toBe('calendar')

    act(() => result.current[1]('table'))
    expect(result.current[0]).toBe('table')
    expect(localStorage.getItem('eventsplit:availabilityView')).toBe('table')
  })

  it('reads back a remembered choice', () => {
    localStorage.setItem('eventsplit:availabilityView', 'table')
    const { result } = renderHook(() => useAvailabilityView())
    expect(result.current[0]).toBe('table')
  })

  it('survives a localStorage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('nope')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('nope')
    })
    const { result } = renderHook(() => useAvailabilityView())
    expect(result.current[0]).toBe('calendar')
    act(() => result.current[1]('table'))
    expect(result.current[0]).toBe('table')
  })
})
