import { lazy, Suspense, useEffect, useState } from 'react'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider } from '@/presentation/context/EventContext'
import { UserProvider } from '@/presentation/context/UserContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { HomePage } from '@/presentation/components/features/home/HomePage'
import { PinPromptModal } from '@/presentation/components/features/security/PinPromptModal'
import { OfflineBanner } from '@/presentation/components/features/pwa/OfflineBanner'
import { UpdateBanner } from '@/presentation/components/features/pwa/UpdateBanner'
import { InstallPrompt } from '@/presentation/components/features/pwa/InstallPrompt'
import { ErrorBanner } from '@/presentation/components/common/ErrorBanner'
import { Footer } from '@/presentation/components/common/Footer'

const EventPage = lazy(() =>
  import('@/presentation/components/features/event/EventPage').then((m) => ({
    default: m.EventPage,
  })),
)

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
              <InstallPrompt />
              <ErrorBanner />
              <Suspense fallback={<div className="p-6 text-slate-400">…</div>}>
                {eventId ? <EventPage eventId={eventId} /> : <HomePage />}
              </Suspense>
              <PinPromptModal />
              <Footer />
            </WriteGuardProvider>
          </UserProvider>
        </EventProvider>
      </SyncProvider>
    </ContainerProvider>
  )
}
