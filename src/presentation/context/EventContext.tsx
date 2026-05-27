import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { EventSnapshot } from '@/domain/entities/Event'
import { useContainer } from '@/presentation/context/ContainerProvider'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'

interface EventState {
  event: EventSnapshot | null
  version: number
  setEvent: (snapshot: EventSnapshot, version: number) => void
}

const Ctx = createContext<EventState | null>(null)

export function EventProvider({ children }: { children: ReactNode }) {
  const container = useContainer()
  const [event, setEventState] = useState<EventSnapshot | null>(null)
  const [version, setVersion] = useState(0)
  // Stable setter so consumers can safely list it in effect deps without looping.
  // Write-through: every update also persists to the local cache, keeping it
  // coherent with in-memory state so the version-gated refresh never
  // re-downloads a snapshot we already hold.
  const setEvent = useCallback(
    (s: EventSnapshot, v: number) => {
      setEventState(s)
      setVersion(v)
      container.resolve<LocalStorageCache>('cache').set(s.id, { snapshot: s, version: v })
    },
    [container],
  )
  const value = useMemo<EventState>(
    () => ({ event, version, setEvent }),
    [event, version, setEvent],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEventState(): EventState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useEventState must be used within EventProvider')
  return c
}
