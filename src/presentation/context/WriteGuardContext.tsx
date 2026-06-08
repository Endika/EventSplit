import { createContext, type ReactNode, useContext, useState } from 'react'
import { useEventState } from '@/presentation/context/EventContext'
import { useEditPin } from '@/presentation/context/EditPinContext'
import { allowWrite } from '@/shared/utils/rateLimit'
import { notify } from '@/shared/utils/notify'

interface PendingExecution {
  fn: () => Promise<unknown> | unknown
  onError: (err: unknown) => void
}

interface WriteGuardState {
  pending: PendingExecution | null
  isLocked: boolean
  verified: boolean
  guardedExecute: (fn: () => Promise<unknown> | unknown, onError?: (err: unknown) => void) => void
  clearPending: () => void
}

const Ctx = createContext<WriteGuardState | null>(null)

export function WriteGuardProvider({ children }: { children: ReactNode }) {
  const { event } = useEventState()
  const { pin: unlockedPin } = useEditPin()
  const [pending, setPending] = useState<PendingExecution | null>(null)

  const isLocked = !!event?.hasPin
  // Verified for this session once the in-memory edit PIN is unlocked (at the
  // gate or prompt). Server-side enforcement needs the plaintext PIN to pass it
  // on every privileged write, so verification is session-scoped, not persisted.
  const verified = !isLocked || unlockedPin !== null

  function guardedExecute(
    fn: () => Promise<unknown> | unknown,
    onError: (err: unknown) => void = () => {},
  ): void {
    if (!allowWrite()) {
      notify('sync.rateLimited')
      return
    }
    if (!isLocked || verified) {
      try {
        const result = fn()
        if (result instanceof Promise) {
          result.catch(onError)
        }
      } catch (err) {
        // Route synchronous throws to onError too, so they don't escape unhandled.
        onError(err)
      }
      return
    }
    setPending({ fn, onError })
  }

  function clearPending(): void {
    setPending(null)
  }

  return (
    <Ctx.Provider value={{ pending, isLocked, verified, guardedExecute, clearPending }}>
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
