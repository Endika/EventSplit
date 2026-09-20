import { useEffect } from 'react'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser, useSetCurrentUser } from '@/presentation/context/UserContext'
import { useEventSync } from '@/presentation/hooks/useEventSync'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import {
  IdentificationModal,
  type IdentificationResult,
} from '@/presentation/components/features/identification/IdentificationModal'
import { EventTabs } from '@/presentation/components/features/event/EventTabs'
import { EventPinGate } from '@/presentation/components/features/security/EventPinGate'
import { useEditPin } from '@/presentation/context/EditPinContext'
import { ShareButton } from '@/presentation/components/common/ShareButton'

export function EventPage({ eventId }: { eventId: string }) {
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const { pin: unlockedPin } = useEditPin()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()
  const { loading, error } = useEventSync(eventId)

  // Restore a previously chosen identity for this event from the local cache.
  useEffect(() => {
    const cache = container.resolve<LocalStorageCache>('cache')
    const identity = cache.getIdentity(eventId)
    if (identity) {
      setMe({
        ...identity,
        displayName: identity.alias ? `${identity.name} (${identity.alias})` : identity.name,
      })
    }
  }, [eventId, container, setMe])

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
      setEvent(result.event, result.version) // setEvent write-through persists to cache
      const identity = { id: result.newUser.id, name: r.newUser.name, alias: r.newUser.alias }
      cache.setIdentity(eventId, identity)
      setMe({ ...identity, displayName: result.newUser.displayName })
    }
  }

  if (loading) return <main className="p-6 text-muted">…</main>
  if (error) return <main className="p-6 text-danger">{error}</main>
  if (!event) return <main className="p-6 text-muted">…</main>

  const needsPin = !!event.hasPin && unlockedPin === null
  if (needsPin) {
    // Unlocking sets the session PIN in EditPinContext, which re-renders this.
    return <EventPinGate event={event} onUnlock={() => {}} />
  }

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-2 hidden items-center justify-between md:flex">
        <h1 className="text-2xl font-bold text-ink">{event.name}</h1>
        <ShareButton eventName={event.name} className="border border-border bg-elevated px-3" />
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
