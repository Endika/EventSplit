import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { useContainer } from '@/presentation/context/ContainerProvider'
import type { OnlineDetector } from '@/infrastructure/network/OnlineDetector'

const Ctx = createContext<{ online: boolean } | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const container = useContainer()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const detector = container.resolve<OnlineDetector>('online')
    return detector.subscribe(setOnline)
  }, [container])

  return <Ctx.Provider value={{ online }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnlineStatus(): boolean {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOnlineStatus must be used within SyncProvider')
  return c.online
}
