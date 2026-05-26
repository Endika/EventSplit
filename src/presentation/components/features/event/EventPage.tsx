import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser, useSetCurrentUser } from '@/presentation/context/UserContext'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import type { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import type { RealtimeSync } from '@/infrastructure/sync/RealtimeSync'
import type { SyncEventHandler } from '@/application/handlers/SyncEventHandler'
import {
  IdentificationModal,
  type IdentificationResult,
} from '@/presentation/components/features/identification/IdentificationModal'
import { EventTabs } from '@/presentation/components/features/event/EventTabs'
import { EventPinGate } from '@/presentation/components/features/security/EventPinGate'

export function EventPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pinTick, setPinTick] = useState(0)

  useEffect(() => {
    const cache = container.resolve<LocalStorageCache>('cache')
    const cached = cache.get(eventId)
    if (cached) setEvent(cached.snapshot, cached.version)
    const identity = cache.getIdentity(eventId)
    if (identity) {
      setMe({
        ...identity,
        displayName: identity.alias ? `${identity.name} (${identity.alias})` : identity.name,
      })
    }

    const repo = container.resolve<IEventRepository>('eventRepo')
    repo
      .findById(eventId)
      .then((row) => {
        if (!row) {
          setError(t('app.notFound'))
          setLoading(false)
          return
        }
        cache.set(eventId, row)
        setEvent(row.snapshot, row.version)
        setLoading(false)
      })
      .catch((err) => {
        if (!cached) setError(err instanceof Error ? err.message : 'Error')
        setLoading(false)
      })
  }, [eventId, container, setEvent, setMe, t])

  useEffect(() => {
    const realtime = container.resolve<RealtimeSync>('realtime')
    const syncHandler = container.resolve<SyncEventHandler>('syncEvent')
    const cache = container.resolve<LocalStorageCache>('cache')

    const unsub = realtime.subscribe(eventId, ({ snapshot, version }) => {
      const localFromCache = cache.get(eventId)
      if (!localFromCache) {
        cache.set(eventId, { snapshot, version })
        setEvent(snapshot, version)
        return
      }
      const result = syncHandler.merge({ local: localFromCache, remote: { snapshot, version } })
      if (result.applied) {
        cache.set(eventId, { snapshot: result.snapshot, version: result.version })
        setEvent(result.snapshot, result.version)
      }
    })
    return unsub
  }, [eventId, container, setEvent])

  // Realtime can miss updates if the WebSocket drops (device sleep, network
  // blips). Re-fetch and merge whenever the tab regains focus or reconnects.
  useEffect(() => {
    const repo = container.resolve<IEventRepository>('eventRepo')
    const syncHandler = container.resolve<SyncEventHandler>('syncEvent')
    const cache = container.resolve<LocalStorageCache>('cache')

    const refetch = () => {
      if (document.visibilityState === 'hidden') return
      repo
        .findById(eventId)
        .then((row) => {
          if (!row) return
          const local = cache.get(eventId)
          if (!local) {
            cache.set(eventId, row)
            setEvent(row.snapshot, row.version)
            return
          }
          const result = syncHandler.merge({ local, remote: row })
          if (result.applied) {
            cache.set(eventId, { snapshot: result.snapshot, version: result.version })
            setEvent(result.snapshot, result.version)
          }
        })
        .catch(() => {})
    }

    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('online', refetch)
    return () => {
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('online', refetch)
    }
  }, [eventId, container, setEvent])

  async function handleIdentification(r: IdentificationResult) {
    const cache = container.resolve<LocalStorageCache>('cache')
    if (r.kind === 'pick' && r.pickedUser) {
      const identity = {
        id: r.pickedUser.id,
        name: r.pickedUser.name,
        alias: r.pickedUser.alias,
      }
      cache.setIdentity(eventId, identity)
      setMe({
        ...identity,
        displayName: r.pickedUser.alias
          ? `${r.pickedUser.name} (${r.pickedUser.alias})`
          : r.pickedUser.name,
      })
      return
    }
    if (r.kind === 'new' && r.newUser) {
      const handler = container.resolve<JoinAsNewUserHandler>('joinAsNewUser')
      const result = await handler.execute({
        eventId,
        name: r.newUser.name,
        alias: r.newUser.alias,
      })
      cache.set(eventId, { snapshot: result.event, version: result.version })
      setEvent(result.event, result.version)
      const identity = { id: result.newUser.id, name: r.newUser.name, alias: r.newUser.alias }
      cache.setIdentity(eventId, identity)
      setMe({ ...identity, displayName: result.newUser.displayName })
    }
  }

  if (loading) return <main className="p-6 text-slate-300">…</main>
  if (error) return <main className="p-6 text-rose-400">{error}</main>
  if (!event) return <main className="p-6 text-slate-300">…</main>

  void pinTick
  const needsPin = !!event.editPin && localStorage.getItem(`eventsplit.pin.${eventId}`) !== 'true'
  if (needsPin) {
    return <EventPinGate event={event} onUnlock={() => setPinTick((n) => n + 1)} />
  }

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-2 hidden items-center justify-between md:flex">
        <h1 className="text-2xl font-bold text-slate-100">{event.name}</h1>
        <button
          type="button"
          onClick={async () => {
            const url = window.location.href
            try {
              if (navigator.share) {
                await navigator.share({ title: event.name, url })
                return
              }
              await navigator.clipboard.writeText(url)
              window.alert(t('event.shareCopied'))
            } catch (err) {
              if ((err as Error)?.name === 'AbortError') return
              console.error('[Share]', err)
            }
          }}
          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {t('event.share')}
        </button>
      </div>
      {!me && (
        <IdentificationModal
          eventName={event.name}
          users={event.users}
          onConfirm={handleIdentification}
        />
      )}
      {me && <EventTabs />}
    </main>
  )
}
