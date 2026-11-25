import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import i18n from '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { EditPinProvider, useEditPin } from '@/presentation/context/EditPinContext'
import { useEventSync } from '@/presentation/hooks/useEventSync'
import { RateLimitedError } from '@/domain/repositories/IEventRepository'
import type { RefreshResult } from '@/application/handlers/RefreshEventHandler'
import type { EventSnapshot } from '@/domain/entities/Event'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { NOTICE_EVENT } from '@/shared/utils/notify'
import { reportError } from '@/shared/utils/reportError'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'
import { inMemoryContainer } from '../../support/inMemoryContainer'
import { makeEvent } from '../../support/eventFixtures'

vi.mock('@/shared/utils/reportError', () => ({ reportError: vi.fn() }))

const ID = 'abc123x'
const cache = new LocalStorageCache()
const pins = new UnlockedPinHolder()
const withHistory = (userId: string | null, over: Partial<EventSnapshot> = {}) =>
  makeEvent({
    id: ID,
    history: userId
      ? [{ id: 'h', version: 2, timestamp: '', type: 'event_created', userId, description: '' }]
      : [],
    ...over,
  } as Partial<EventSnapshot>)
const updated = (snapshot: EventSnapshot, version = 2): RefreshResult => ({
  status: 'updated',
  snapshot,
  version,
})

function setup(first: RefreshResult | Error = { status: 'locked' }) {
  const refresh = { execute: vi.fn<(input: unknown) => Promise<RefreshResult>>() }
  if (first instanceof Error) refresh.execute.mockRejectedValue(first)
  else refresh.execute.mockResolvedValue(first)
  const notifier = { listener: () => {}, unsubscribe: vi.fn(), subscribedTo: [] as string[] }
  const container = inMemoryContainer(new InMemoryEventRepository())
  container.register('refreshEvent', () => refresh)
  container.register('realtime', () => ({
    publish: () => {},
    subscribe: (id: string, cb: () => void) => {
      notifier.subscribedTo.push(id)
      notifier.listener = cb
      return notifier.unsubscribe
    },
  }))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContainerProvider container={container}>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>{children}</EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>
  )
  const hook = renderHook(
    ({ eventId }) => ({
      sync: useEventSync(eventId),
      event: useEventState().event,
      pin: useEditPin(eventId).pin,
      setUser: useSetCurrentUser(),
    }),
    { wrapper, initialProps: { eventId: ID } },
  )
  return { refresh, notifier, hook, container }
}

const flush = () => act(async () => {})
const notices = () => {
  const keys: string[] = []
  window.addEventListener(NOTICE_EVENT, (e) => keys.push((e as CustomEvent).detail.key))
  return keys
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(reportError).mockClear()
})

describe('useEventSync', () => {
  it('shows loading, then paints the server copy fetched with no local copy', async () => {
    const { refresh, hook } = setup(updated(withHistory(null)))
    expect(hook.result.current.sync).toMatchObject({ loading: true, error: null, locked: false })
    await waitFor(() => expect(hook.result.current.sync.loading).toBe(false))
    expect(hook.result.current.event?.id).toBe(ID)
    expect(refresh.execute).toHaveBeenCalledExactlyOnceWith({ eventId: ID, local: null })
  })

  it.each([
    ['without the PIN', null, false],
    ['with the PIN', '1234', true],
  ])('treats a PIN-protected cached copy %s', async (_l, pin, trusted) => {
    const cached = withHistory(null, { hasPin: true })
    cache.set(ID, { snapshot: cached, version: 3 })
    if (pin) pins.set(ID, pin)
    const { refresh, hook } = setup({ status: 'locked' })
    expect(hook.result.current.event !== null).toBe(trusted)
    await flush()
    expect((refresh.execute.mock.calls[0]![0] as { local: unknown }).local !== null).toBe(trusted)
  })

  it.each([
    ['someone else last edited', 'u2', ['sync.remoteUpdate'], 'updated'],
    ['I last edited', 'u1', [], 'updated'],
    ['there is no history', null, [], 'updated'],
    ['nothing changed since', 'u2', [], 'unchanged'],
  ] as const)('on a live ping, toasts when %s', async (_l, lastBy, expected, status) => {
    const { refresh, notifier, hook } = setup()
    await flush()
    act(() => hook.result.current.setUser({ id: 'u1', name: 'A', alias: null, displayName: 'A' }))
    const keys = notices()
    const snapshot = withHistory(lastBy)
    refresh.execute.mockResolvedValueOnce(
      status === 'unchanged' ? { status, snapshot, version: 2 } : updated(snapshot),
    )
    await act(async () => notifier.listener())
    expect(keys).toEqual(expected)
  })

  it('stays quiet on the first, silent reconcile and on a manual refetch', async () => {
    const { refresh, hook } = setup(updated(withHistory('u2')))
    const keys = notices()
    await flush()
    await act(async () => hook.result.current.sync.refetch())
    expect(refresh.execute).toHaveBeenCalledTimes(2)
    expect(keys).toEqual([])
  })

  it('subscribes to the event and unsubscribes on unmount', async () => {
    const { notifier, hook } = setup()
    await flush()
    expect(notifier.subscribedTo).toEqual([ID])
    hook.unmount()
    expect(notifier.unsubscribe).toHaveBeenCalledOnce()
  })

  it.each([
    [
      'tab becomes visible',
      () => document.dispatchEvent(new Event('visibilitychange')),
      'visible',
      2,
    ],
    [
      'tab becomes hidden',
      () => document.dispatchEvent(new Event('visibilitychange')),
      'hidden',
      1,
    ],
    ['the network comes back', () => window.dispatchEvent(new Event('online')), 'visible', 2],
  ])('reconciles when the %s, and stops listening once unmounted', async (_l, fire, vis, calls) => {
    const { refresh, hook } = setup()
    await flush()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(vis as DocumentVisibilityState)
    await act(async () => fire())
    expect(refresh.execute).toHaveBeenCalledTimes(calls)
    hook.unmount()
    fire()
    expect(refresh.execute).toHaveBeenCalledTimes(calls)
    vi.restoreAllMocks()
  })

  it('refetches for a new event and drops the old subscription', async () => {
    const { refresh, notifier, hook } = setup(updated(withHistory(null)))
    await flush()
    refresh.execute.mockReturnValue(new Promise(() => {}))
    hook.rerender({ eventId: 'other00' })
    await flush()
    expect(notifier.subscribedTo).toEqual([ID, 'other00'])
    expect(notifier.unsubscribe).toHaveBeenCalledOnce()
    expect(refresh.execute).toHaveBeenLastCalledWith({ eventId: 'other00', local: null })
    expect(hook.result.current.sync.loading).toBe(true)
    window.dispatchEvent(new Event('online'))
    act(() => hook.result.current.sync.refetch())
    expect(
      refresh.execute.mock.calls.slice(-2).map(([i]) => (i as { eventId: string }).eventId),
    ).toEqual(['other00', 'other00'])
  })

  it('keeps the held PIN and waits at the gate when the event is throttled', async () => {
    pins.set(ID, '1234')
    const { hook } = setup(new RateLimitedError())
    await waitFor(() => expect(hook.result.current.sync.locked).toBe(true))
    expect(hook.result.current.pin).toBe('1234')
    expect(hook.result.current.sync.error).toBeNull()
    expect(reportError).not.toHaveBeenCalled()
  })

  it.each([
    ['no copy on screen', false, i18n.t('errors.generic')],
    ['a copy on screen', true, null],
  ])('on a failed read with %s', async (_l, hasCopy, error) => {
    const boom = new Error('network')
    if (hasCopy) cache.set(ID, { snapshot: withHistory(null), version: 1 })
    const { hook } = setup(boom)
    await flush()
    expect(hook.result.current.sync.error).toBe(error)
    expect(hook.result.current.sync.locked).toBe(false)
    expect(reportError).toHaveBeenCalledExactlyOnceWith('useEventSync', boom)
  })

  it.each([
    ['a held PIN', '1234'],
    ['no PIN', null],
  ])('wipes the cached copy when locked, with %s', async (_l, pin) => {
    cache.set(ID, { snapshot: withHistory(null), version: 1 })
    if (pin) pins.set(ID, pin)
    const setSpy = vi.spyOn(UnlockedPinHolder.prototype, 'set')
    const { hook } = setup({ status: 'locked' })
    await waitFor(() => expect(hook.result.current.sync.locked).toBe(true))
    expect(cache.get(ID)).toBeNull()
    expect(hook.result.current.pin).toBeNull()
    expect(setSpy).toHaveBeenCalledTimes(pin ? 1 : 0)
    setSpy.mockRestore()
  })

  it.each([
    ['no copy on screen', false, i18n.t('app.notFound')],
    ['a copy on screen', true, null],
  ])('on not_found with %s', async (_l, hasCopy, error) => {
    if (hasCopy) cache.set(ID, { snapshot: withHistory(null), version: 1 })
    const { hook } = setup({ status: 'not_found' })
    await flush()
    expect(hook.result.current.sync.error).toBe(error)
  })

  it('clears an earlier error and the locked state once a refetch succeeds', async () => {
    const { refresh, hook } = setup(new Error('network'))
    await flush()
    expect(hook.result.current.sync.error).not.toBeNull()
    refresh.execute.mockResolvedValueOnce({ status: 'locked' })
    await act(async () => hook.result.current.sync.refetch())
    expect(hook.result.current.sync).toMatchObject({ error: null, locked: true })
    refresh.execute.mockResolvedValueOnce(updated(withHistory(null)))
    await act(async () => hook.result.current.sync.refetch())
    expect(hook.result.current.sync).toMatchObject({ error: null, locked: false })
  })
})
