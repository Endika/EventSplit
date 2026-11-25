import { it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EditPinProvider, useEditPin } from '@/presentation/context/EditPinContext'
import { Container } from '@/shared/di/Container'

function containerWithHolder() {
  const holder = { get: vi.fn(() => null), set: vi.fn() }
  const container = new Container()
  container.register('unlockedPin', () => holder)
  return { container, holder }
}

function render(initialContainer: Container, initialEventId: string | undefined) {
  let container = initialContainer
  const hook = renderHook(({ eventId }) => useEditPin(eventId), {
    initialProps: { eventId: initialEventId },
    wrapper: ({ children }: { children: ReactNode }) => (
      <ContainerProvider container={container}>
        <EditPinProvider>{children}</EditPinProvider>
      </ContainerProvider>
    ),
  })
  return { hook, swap: (next: Container) => (container = next) }
}

it('does nothing for an event that does not exist yet', () => {
  const { container, holder } = containerWithHolder()
  holder.get.mockReturnValue('1234' as never)
  const { hook } = render(container, undefined)
  act(() => hook.result.current.setPin('5678'))
  expect(hook.result.current.pin).toBeNull()
  expect(holder.set).not.toHaveBeenCalled()
})

it('stores the PIN for the current event and re-reads it after each change', () => {
  const { container, holder } = containerWithHolder()
  const { hook } = render(container, 'ev1')
  holder.get.mockReturnValue('1234' as never)
  act(() => hook.result.current.setPin('1234'))
  expect(holder.set).toHaveBeenLastCalledWith('ev1', '1234')
  expect(hook.result.current.pin).toBe('1234')
  hook.rerender({ eventId: 'ev2' })
  act(() => hook.result.current.setPin(null))
  expect(holder.set).toHaveBeenLastCalledWith('ev2', null)
  act(() => hook.result.current.setPin('0000'))
  expect(holder.get).toHaveBeenLastCalledWith('ev2')
})

it('writes through the holder of the container it was rewired to', () => {
  const a = containerWithHolder()
  const b = containerWithHolder()
  const { hook, swap } = render(a.container, 'ev1')
  swap(b.container)
  hook.rerender({ eventId: 'ev1' })
  act(() => hook.result.current.setPin('1234'))
  expect(b.holder.set).toHaveBeenCalledOnce()
  expect(a.holder.set).not.toHaveBeenCalled()
})
