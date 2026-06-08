import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useContainer } from '@/presentation/context/ContainerProvider'
import type { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

/**
 * Holds the edit PIN unlocked at the gate for the lifetime of the session, so
 * privileged actions (set-pin, delete) can pass it to the server (which enforces
 * it). null = no PIN in play (PIN-less event, or not yet unlocked).
 *
 * The React state drives re-renders of gated UI; on every change we mirror the
 * value into the DI {@link UnlockedPinHolder} singleton, which is the source the
 * repository decorator (PinForwardingEventRepository) reads so that the ~28
 * collaborative write handlers can stay PIN-less in their signatures.
 */
interface EditPinState {
  pin: string | null
  setPin: (pin: string | null) => void
}

const Ctx = createContext<EditPinState | null>(null)

export function EditPinProvider({ children }: { children: ReactNode }) {
  const container = useContainer()
  const [pin, setPinState] = useState<string | null>(null)

  const setPin = useCallback(
    (next: string | null) => {
      setPinState(next)
      // Mirror into the holder the repository layer reads (source of truth for writes).
      container.resolve<UnlockedPinHolder>('unlockedPin').set(next)
    },
    [container],
  )

  return <Ctx.Provider value={{ pin, setPin }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditPin(): EditPinState {
  const s = useContext(Ctx)
  if (!s) throw new Error('useEditPin must be used within EditPinProvider')
  return s
}
