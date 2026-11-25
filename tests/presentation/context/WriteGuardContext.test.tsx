import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { WriteGuardProvider, useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { NOTICE_EVENT } from '@/shared/utils/notify'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'
import { inMemoryContainer } from '../../support/inMemoryContainer'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { makeEvent } from '../../support/eventFixtures'

const wrapper = ({ children }: { children: ReactNode }) => (
  <ContainerProvider container={inMemoryContainer(new InMemoryEventRepository())}>
    <EventProvider>
      <EditPinProvider>
        <WriteGuardProvider>{children}</WriteGuardProvider>
      </EditPinProvider>
    </EventProvider>
  </ContainerProvider>
)

function guard(event: { hasPin: boolean } | null, pin: string | null = null) {
  if (pin) new UnlockedPinHolder().set('abc123x', pin)
  const hook = renderHook(() => ({ ...useWriteGuard(), state: useEventState() }), { wrapper })
  if (event) act(() => hook.result.current.state.setEvent(makeEvent(event), 1))
  return hook
}

beforeEach(() => localStorage.clear())

describe('WriteGuardProvider', () => {
  it.each([
    ['there is no event', null, null, false, true],
    ['the event has no PIN', { hasPin: false }, null, false, true],
    ['the event has a PIN and it is unlocked here', { hasPin: true }, '1234', true, true],
    ['the event has a PIN and it is not unlocked here', { hasPin: true }, null, true, false],
  ])('when %s', (_l, event, pin, isLocked, runs) => {
    const { result } = guard(event, pin)
    const fn = vi.fn()
    act(() => result.current.guardedExecute(fn))
    expect(result.current).toMatchObject({ isLocked, verified: runs })
    expect(fn).toHaveBeenCalledTimes(runs ? 1 : 0)
    expect(result.current.pending !== null).toBe(!runs)
  })

  it('keeps a held write with its error handler until it is cleared', () => {
    const { result } = guard({ hasPin: true })
    const fn = vi.fn()
    const onError = vi.fn()
    act(() => result.current.guardedExecute(fn, onError))
    expect(result.current.pending).toEqual({ fn, onError })
    act(() => result.current.clearPending())
    expect(result.current.pending).toBeNull()
  })

  it('refuses the write and tells the user once the device is over its budget', () => {
    const now = Date.now()
    localStorage.setItem('eventsplit.writes', JSON.stringify(Array(60).fill(now)))
    const keys: string[] = []
    window.addEventListener(NOTICE_EVENT, (e) => keys.push((e as CustomEvent).detail.key))
    const { result } = guard({ hasPin: false })
    const fn = vi.fn()
    act(() => result.current.guardedExecute(fn))
    expect(fn).not.toHaveBeenCalled()
    expect(result.current.pending).toBeNull()
    expect(keys).toEqual(['sync.rateLimited'])
  })

  it.each([
    ['a rejected promise', () => Promise.reject(new Error('x')), 1],
    [
      'a synchronous throw',
      () => {
        throw new Error('x')
      },
      1,
    ],
    ['a plain result', () => 5, 0],
  ])('routes %s to the error handler as needed', async (_l, fn, calls) => {
    const { result } = guard({ hasPin: false })
    const onError = vi.fn()
    await act(async () => result.current.guardedExecute(fn, onError))
    expect(onError).toHaveBeenCalledTimes(calls)
  })

  it('swallows a failure when no error handler is given', () => {
    const { result } = guard({ hasPin: false })
    expect(() =>
      act(() =>
        result.current.guardedExecute(() => {
          throw new Error('x')
        }),
      ),
    ).not.toThrow()
  })
})
