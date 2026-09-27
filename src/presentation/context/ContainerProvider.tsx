import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { Container } from '@/shared/di/Container'
import { buildContainer } from '@/shared/di/wiring'

const Ctx = createContext<Container | null>(null)

/** `container` lets tests supply one wired to in-memory fakes. */
export function ContainerProvider({
  children,
  container: given,
}: {
  children: ReactNode
  container?: Container
}) {
  const container = useMemo(() => given ?? buildContainer(), [given])
  return <Ctx.Provider value={container}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContainer(): Container {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContainer must be used within ContainerProvider')
  return c
}
