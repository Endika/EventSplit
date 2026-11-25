import { it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { Container } from '@/shared/di/Container'
import { makeEvent } from '../../support/eventFixtures'

function containerWithCache() {
  const cache = { set: vi.fn() }
  const container = new Container()
  container.register('cache', () => cache)
  return { container, cache }
}

it('keeps the event and version, writing through to the cache of the current container', () => {
  const first = containerWithCache()
  const second = containerWithCache()
  let current = first.container
  const { result, rerender } = renderHook(() => useEventState(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ContainerProvider container={current}>
        <EventProvider>{children}</EventProvider>
      </ContainerProvider>
    ),
  })
  const snapshot = makeEvent()
  act(() => result.current.setEvent(snapshot, 5))
  expect(result.current).toMatchObject({ event: snapshot, version: 5 })
  expect(first.cache.set).toHaveBeenCalledExactlyOnceWith(snapshot.id, { snapshot, version: 5 })

  current = second.container
  rerender()
  act(() => result.current.setEvent(snapshot, 6))
  expect(second.cache.set).toHaveBeenCalledExactlyOnceWith(snapshot.id, { snapshot, version: 6 })
  expect(first.cache.set).toHaveBeenCalledOnce()
})
