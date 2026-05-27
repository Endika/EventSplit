import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export function EventPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()
  const [pinTick, setPinTick] = useState(0)
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
