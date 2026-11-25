import { it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { SyncProvider, useOnlineStatus } from '@/presentation/context/SyncContext'
import { Container } from '@/shared/di/Container'

function detectorContainer() {
  const unsubscribe = vi.fn()
  const detector = { listener: (_online: boolean) => {}, subscribe: vi.fn() }
  detector.subscribe.mockImplementation((cb: (online: boolean) => void) => {
    detector.listener = cb
    return unsubscribe
  })
  const container = new Container()
  container.register('online', () => detector)
  return { container, detector, unsubscribe }
}

it('reports online until the detector says otherwise, and follows a container swap', () => {
  const first = detectorContainer()
  let current = first.container
  const { result, rerender, unmount } = renderHook(() => useOnlineStatus(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ContainerProvider container={current}>
        <SyncProvider>{children}</SyncProvider>
      </ContainerProvider>
    ),
  })
  expect(result.current).toBe(true)
  act(() => first.detector.listener(false))
  expect(result.current).toBe(false)

  const second = detectorContainer()
  current = second.container
  rerender()
  expect(first.unsubscribe).toHaveBeenCalledOnce()
  expect(second.detector.subscribe).toHaveBeenCalledOnce()
  unmount()
  expect(second.unsubscribe).toHaveBeenCalledOnce()
})
