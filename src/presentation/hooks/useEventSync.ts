import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'
import type { RefreshEventHandler } from '@/application/handlers/RefreshEventHandler'
import { notify } from '@/shared/utils/notify'

/**
 * Keeps the event in {@link useEventState} in sync with the server while
 * minimising egress: it paints instantly from the local cache, then reconciles
 * through {@link RefreshEventHandler} (which downloads the full snapshot only
 * when the remote version is newer). Realtime pings, tab refocus and reconnect
 * all funnel through the same version-gated reconciliation.
 */
export function useEventSync(eventId: string): { loading: boolean; error: string | null } {
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const { t } = useTranslation()
  const meId = useCurrentUser()?.id
  const [error, setError] = useState<string | null>(null)

  const reconcile = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      const cache = container.resolve<LocalStorageCache>('cache')
      const refresh = container.resolve<RefreshEventHandler>('refreshEvent')
      const local = cache.get(eventId)
      const result = await refresh.execute({ eventId, local })
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
    [eventId, container, setEvent, t, meId],
  )

  // Paint from cache immediately, then reconcile with the server (silently).
  useEffect(() => {
    const cache = container.resolve<LocalStorageCache>('cache')
    const cached = cache.get(eventId)
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

  const loading = (event === null || event.id !== eventId) && error === null
  return { loading, error }
}
