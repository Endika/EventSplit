import { createContext, type ReactNode, useContext, useState } from 'react'
import type { EventSnapshot } from '@/domain/entities/Event'

interface EventState {
  event: EventSnapshot | null
  version: number
  setEvent: (snapshot: EventSnapshot, version: number) => void
}

const Ctx = createContext<EventState | null>(null)

export function EventProvider({ children }: { children: ReactNode }) {
  const [event, setEventState] = useState<EventSnapshot | null>(null)
  const [version, setVersion] = useState(0)
  return (
    <Ctx.Provider
      value={{
        event,
        version,
        setEvent: (s, v) => {
          setEventState(s)
          setVersion(v)
        },
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEventState(): EventState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useEventState must be used within EventProvider')
  return c
}
