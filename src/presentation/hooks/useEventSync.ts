import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useEditPin } from '@/presentation/context/EditPinContext'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'
import { RateLimitedError } from '@/domain/repositories/IEventRepository'
import type { RefreshEventHandler, RefreshResult } from '@/application/handlers/RefreshEventHandler'
import type { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'
import { notify } from '@/shared/utils/notify'
import { reportError } from '@/shared/utils/reportError'

/**
 * Keeps the event in {@link useEventState} in sync with the server while
 * minimising egress: it paints instantly from the local cache, then reconciles
 * through {@link RefreshEventHandler} (which downloads the full snapshot only
 * when the remote version is newer). Realtime pings, tab refocus and reconnect
 * all funnel through the same version-gated reconciliation.
 *
 * A PIN-protected event this device holds no PIN for comes back `locked`: its
 * cached copy is wiped and nothing is painted. `refetch` reads it again once
 * the PIN is unlocked.
 */
export function useEventSync(eventId: string): {
  loading: boolean
  error: string | null
  locked: boolean
  refetch: () => void
} {
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const { t } = useTranslation()
  const meId = useCurrentUser()?.id
  const { setPin } = useEditPin(eventId)
  const [error, setError] = useState<string | null>(null)
  const [lockedId, setLockedId] = useState<string | null>(null)

  const reconcile = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      const cache = container.resolve<LocalStorageCache>('cache')
      const refresh = container.resolve<RefreshEventHandler>('refreshEvent')
      const heldPin = container.resolve<UnlockedPinHolder>('unlockedPin').get(eventId)
      const local = usableCopy(cache, eventId, heldPin)
      let result: RefreshResult
      try {
        result = await refresh.execute({ eventId, local })
      } catch (err) {
        // Others' wrong guesses throttled the event: the held PIN is not at
        // fault, so keep it and wait at the gate, which explains the wait.
        if (err instanceof RateLimitedError) {
          setLockedId(eventId)
          return
        }
        reportError('useEventSync', err)
        // No copy on screen to fall back on: this reconcile is all the user
        // has, so show the app's error instead of spinning forever. With a
        // copy already showing, keep it — this was a background reconcile
        // (realtime ping, refocus, reconnect) and must not throw further.
        // A read here only ever fails with a network/transport error (no
        // domain-validation error carries a meaningful message to show
        // instead), so this is always the generic translated message, never
        // the thrown error's own (untranslated) text.
        if (!local) setError(t('errors.generic'))
        return
      }
      setError(null)
      if (result.status === 'locked') {
        cache.removeSnapshot(eventId)
        // A held PIN the server refused was changed elsewhere; keeping it would
        // count every later sync as a failed guess against the throttle.
        if (heldPin !== null) setPin(null)
        setLockedId(eventId)
        return
      }
      setLockedId(null)
      if (result.status === 'not_found') {
        if (!local) setError(t('app.notFound'))
        return
      }
      if (result.status === 'updated') {
        setEvent(result.snapshot, result.version) // write-through also persists to cache
        // Toast live changes from other people, but stay quiet on the first paint.
        const lastBy = result.snapshot.history.at(-1)?.userId
        if (!silent && lastBy && lastBy !== meId) notify('sync.remoteUpdate')
      }
    },
    [eventId, container, setEvent, t, meId, setPin],
  )

  // Paint from cache immediately, then reconcile with the server (silently).
  useEffect(() => {
    const cache = container.resolve<LocalStorageCache>('cache')
    const heldPin = container.resolve<UnlockedPinHolder>('unlockedPin').get(eventId)
    const cached = usableCopy(cache, eventId, heldPin)
    if (cached) setEvent(cached.snapshot, cached.version)
    // reconcile is async: state is set after the await, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reconcile({ silent: true })
  }, [eventId, container, setEvent, reconcile])

  // A tiny version ping over Realtime just asks us to reconcile (version-gated).
  useEffect(() => {
    const notifier = container.resolve<IEventChangeNotifier>('realtime')
    return notifier.subscribe(eventId, () => void reconcile())
  }, [eventId, container, reconcile])

  // Realtime is best-effort: reconcile whenever the tab regains focus or reconnects.
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === 'hidden') return
      void reconcile()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', onWake)
    }
  }, [reconcile])

  const refetch = useCallback(() => void reconcile({ silent: true }), [reconcile])

  const locked = lockedId === eventId
  const loading = (event === null || event.id !== eventId) && error === null && !locked
  return { loading, error, locked, refetch }
}

/**
 * The cached copy, unless it is of a PIN-protected event this device holds no
 * PIN for: that one is neither painted nor trusted as current, so the server
 * gets asked and its locked answer wipes it.
 */
function usableCopy(cache: LocalStorageCache, eventId: string, heldPin: string | null) {
  const cached = cache.get(eventId)
  if (cached?.snapshot.hasPin && heldPin === null) return null
  return cached
}
