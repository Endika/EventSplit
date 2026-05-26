import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
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
  // Stable setter so consumers can safely list it in effect deps without looping.
  const setEvent = useCallback((s: EventSnapshot, v: number) => {
    setEventState(s)
    setVersion(v)
  }, [])
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
