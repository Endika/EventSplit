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

export function EventPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <main className="p-6">…</main>
  if (error) return <main className="p-6 text-red-600">{error}</main>
  if (!event) return <main className="p-6">…</main>

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-bold">{event.name}</h1>
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
