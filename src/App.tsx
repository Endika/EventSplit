import { useEffect, useState } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { HomePage } from '@/presentation/components/features/home/HomePage'
import { EventPage } from '@/presentation/components/features/event/EventPage'
import { OfflineBanner } from '@/presentation/components/features/pwa/OfflineBanner'
import { UpdateBanner } from '@/presentation/components/features/pwa/UpdateBanner'

function useEventIdFromUrl(): string | null {
  const [id, setId] = useState<string | null>(() =>
    new URL(window.location.href).searchParams.get('event'),
  )
  useEffect(() => {
    const handler = () => setId(new URL(window.location.href).searchParams.get('event'))
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  return id
}

export default function App() {
  const eventId = useEventIdFromUrl()
  return (
    <ContainerProvider>
      <SyncProvider>
        <EventProvider>
          <UserProvider>
              <OfflineBanner />
              <UpdateBanner />
              {eventId ? <EventPage eventId={eventId} /> : <HomePage />}
            </UserProvider>
        </EventProvider>
      </SyncProvider>
    </ContainerProvider>
  )
}
