import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { Container } from '@/shared/di/Container'
import { buildContainer } from '@/shared/di/wiring'

const Ctx = createContext<Container | null>(null)

export function ContainerProvider({ children }: { children: ReactNode }) {
  const container = useMemo(() => buildContainer(), [])
  return <Ctx.Provider value={container}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContainer(): Container {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContainer must be used within ContainerProvider')
  return c
}
