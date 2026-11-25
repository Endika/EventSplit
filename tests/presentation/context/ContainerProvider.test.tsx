import { it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ContainerProvider, useContainer } from '@/presentation/context/ContainerProvider'
import { Container } from '@/shared/di/Container'

it('hands consumers the container it is given, following a swap', () => {
  let given = new Container()
  const first = given
  const { result, rerender } = renderHook(() => useContainer(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ContainerProvider container={given}>{children}</ContainerProvider>
    ),
  })
  expect(result.current).toBe(first)
  given = new Container()
  rerender()
  expect(result.current).toBe(given)
})
