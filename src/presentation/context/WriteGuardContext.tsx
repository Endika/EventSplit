import { createContext, type ReactNode, useContext, useState } from 'react'
import { useEventState } from '@/presentation/context/EventContext'

interface PendingExecution {
  fn: () => Promise<unknown> | unknown
  onError: (err: unknown) => void
}

interface WriteGuardState {
  pending: PendingExecution | null
  isLocked: boolean
  verified: boolean
  markVerified: () => void
  guardedExecute: (
    fn: () => Promise<unknown> | unknown,
    onError?: (err: unknown) => void,
  ) => void
  clearPending: () => void
}

const Ctx = createContext<WriteGuardState | null>(null)

function pinKey(eventId: string): string {
  return `eventsplit.pin.${eventId}`
}

export function WriteGuardProvider({ children }: { children: ReactNode }) {
  const { event } = useEventState()
  const [pending, setPending] = useState<PendingExecution | null>(null)
  // verified-state tick: bumped when markVerified is called to trigger re-render
  const [verifiedTick, setVerifiedTick] = useState(0)

  const isLocked = !!event?.editPin
  const verified =
    !isLocked || (event ? localStorage.getItem(pinKey(event.id)) === 'true' : false)

  function markVerified(): void {
    if (event) {
      localStorage.setItem(pinKey(event.id), 'true')
      setVerifiedTick((n) => n + 1)
    }
  }

  function guardedExecute(
    fn: () => Promise<unknown> | unknown,
    onError: (err: unknown) => void = () => {},
  ): void {
    if (!isLocked || verified) {
      const result = fn()
      if (result instanceof Promise) {
        result.catch(onError)
      }
      return
    }
    setPending({ fn, onError })
  }

  function clearPending(): void {
    setPending(null)
  }

  // Use verifiedTick to ensure context re-evaluates `verified` after unlock
  void verifiedTick

  return (
    <Ctx.Provider
      value={{ pending, isLocked, verified, markVerified, guardedExecute, clearPending }}
    >
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWriteGuard(): WriteGuardState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useWriteGuard must be used within WriteGuardProvider')
  return c
}
