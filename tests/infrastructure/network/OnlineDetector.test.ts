import { describe, it, expect, afterEach, vi } from 'vitest'
import { OnlineDetector } from '@/infrastructure/network/OnlineDetector'

function setOnline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

describe('OnlineDetector', () => {
  afterEach(() => vi.restoreAllMocks())

  it('hands each subscriber the current state, then every browser change until it unsubscribes', () => {
    const detector = new OnlineDetector()
    detector.start()
    setOnline(true)
    const first = vi.fn()
    const second = vi.fn()

    const unsubscribeFirst = detector.subscribe(first)
    detector.subscribe(second)
    expect(first).toHaveBeenCalledExactlyOnceWith(true)

    setOnline(false)
    window.dispatchEvent(new Event('offline'))
    expect(first).toHaveBeenLastCalledWith(false)
    expect(second).toHaveBeenLastCalledWith(false)

    unsubscribeFirst()
    setOnline(true)
    window.dispatchEvent(new Event('online'))
    expect(first).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenLastCalledWith(true)
    detector.stop()
  })

  it('registers its window listeners once however often it starts, and removes them on stop', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const detector = new OnlineDetector()

    detector.start()
    detector.start()
    expect(add.mock.calls.map(([type]) => type)).toEqual(['online', 'offline'])

    detector.stop()
    expect(remove.mock.calls.map(([type]) => type)).toEqual(['online', 'offline'])
    expect(remove.mock.calls[0]?.[1]).toBe(add.mock.calls[0]?.[1])

    detector.start()
    expect(add).toHaveBeenCalledTimes(4)
    detector.stop()
  })
})
