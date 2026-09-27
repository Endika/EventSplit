import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useContainer } from '@/presentation/context/ContainerProvider'
import type { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

/**
 * The edit PIN unlocked for each event, remembered on this device so reads and
 * privileged actions can pass it to the server (which enforces it). null = no
 * PIN in play for that event (PIN-less, or not unlocked here).
 *
 * The DI {@link UnlockedPinHolder} is the store (the repository decorator reads
 * it, so the ~28 collaborative write handlers stay PIN-less in their
 * signatures); this context only makes gated UI re-render when it changes.
 */
interface EditPinStore {
  pinFor: (eventId: string) => string | null
  setPin: (eventId: string, pin: string | null) => void
}

const Ctx = createContext<EditPinStore | null>(null)

export function EditPinProvider({ children }: { children: ReactNode }) {
  const container = useContainer()
  const [revision, setRevision] = useState(0)

  const setPin = useCallback(
    (eventId: string, next: string | null) => {
      container.resolve<UnlockedPinHolder>('unlockedPin').set(eventId, next)
      setRevision((r) => r + 1)
    },
    [container],
  )

  const value = useMemo<EditPinStore>(() => {
    void revision // a new store identity per change re-renders every consumer
    const holder = container.resolve<UnlockedPinHolder>('unlockedPin')
    return { pinFor: (eventId) => holder.get(eventId), setPin }
  }, [container, setPin, revision])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditPins(): EditPinStore {
  const s = useContext(Ctx)
  if (!s) throw new Error('useEditPins must be used within EditPinProvider')
  return s
}

/** The PIN for one event; with no event yet, there is no PIN and setting is a no-op. */
// eslint-disable-next-line react-refresh/only-export-components
export function useEditPin(eventId: string | undefined): {
  pin: string | null
  setPin: (pin: string | null) => void
} {
  const { pinFor, setPin } = useEditPins()
  const setForEvent = useCallback(
    (next: string | null) => {
      if (eventId) setPin(eventId, next)
    },
    [eventId, setPin],
  )
  return { pin: eventId ? pinFor(eventId) : null, setPin: setForEvent }
}
