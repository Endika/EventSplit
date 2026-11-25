import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportError, ERROR_EVENT } from '@/shared/utils/reportError'
import { isStaleClientError, STALE_CLIENT_EVENT } from '@/shared/utils/staleClient'

function capture(type: string) {
  const seen: Event[] = []
  const listener = (e: Event) => seen.push(e)
  window.addEventListener(type, listener)
  return { seen, stop: () => window.removeEventListener(type, listener) }
}

describe('window events', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([
    [new TypeError('boom'), { name: 'TypeError', message: 'boom' }],
    ['plain text', { name: 'Error', message: 'plain text' }],
  ])('reportError logs %o and surfaces it on the error banner', (err, expected) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const errors = capture(ERROR_EVENT)
    const stale = capture(STALE_CLIENT_EVENT)
    reportError('save', err)
    errors.stop()
    stale.stop()
    expect(log).toHaveBeenCalledExactlyOnceWith('[save]', err)
    expect(errors.seen.map((e) => (e as CustomEvent).detail)).toEqual([
      { context: 'save', ...expected, at: 1_700_000_000_000 },
    ])
    expect(stale.seen).toEqual([])
  })

  it('reportError sends a stale-client error to the update prompt instead of the error banner', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const errors = capture(ERROR_EVENT)
    const stale = capture(STALE_CLIENT_EVENT)
    reportError('save', { code: 'STALE_CLIENT' })
    errors.stop()
    stale.stop()
    expect(stale.seen).toHaveLength(1)
    expect(errors.seen).toEqual([])
  })

  it.each([
    [{ code: 'STALE_CLIENT' }, true],
    [Object.assign(new Error('old'), { code: 'STALE_CLIENT' }), true],
    [{ code: 'OTHER' }, false],
    [{}, false],
    ['STALE_CLIENT', false],
    [null, false],
    [undefined, false],
  ])('isStaleClientError(%o) is %s', (err, expected) => {
    expect(isStaleClientError(err)).toBe(expected)
  })
})
