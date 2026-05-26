import { useEffect, useState } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { HomePage } from '@/presentation/components/features/home/HomePage'
import { EventPage } from '@/presentation/components/features/event/EventPage'
import { PinPromptModal } from '@/presentation/components/features/security/PinPromptModal'
import { OfflineBanner } from '@/presentation/components/features/pwa/OfflineBanner'
import { UpdateBanner } from '@/presentation/components/features/pwa/UpdateBanner'
import { ErrorBanner } from '@/presentation/components/common/ErrorBanner'
import { Footer } from '@/presentation/components/common/Footer'

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
            <WriteGuardProvider>
              <OfflineBanner />
              <UpdateBanner />
              <ErrorBanner />
              {eventId ? <EventPage eventId={eventId} /> : <HomePage />}
              <PinPromptModal />
              <Footer />
            </WriteGuardProvider>
          </UserProvider>
        </EventProvider>
      </SyncProvider>
    </ContainerProvider>
  )
}
