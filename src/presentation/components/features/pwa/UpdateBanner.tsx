import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/presentation/components/common/Button'
import { STALE_CLIENT_EVENT } from '@/shared/utils/staleClient'

const UPDATE_CHECK_INTERVAL_MS = 60_000

export function UpdateBanner() {
  const { t } = useTranslation()
  const [needRefresh, setNeedRefresh] = useState(false)
  // Set when the server rejected a write because this build runs an older
  // schema than the stored event. It's the strongest "you must update" signal,
  // so the prompt stays until the user reloads to the current build.
  const [stale, setStale] = useState(false)
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh: () => setNeedRefresh(true),
    onOfflineReady: () => {},
    onRegisteredSW(_swUrl, registration) {
      // Poll for a new service worker while the app stays open so PWA installs
      // don't get stuck on a stale version.
      if (!registration) return
      setInterval(() => {
        void registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
    },
  })

  useEffect(() => {
    const onStale = () => setStale(true)
    window.addEventListener(STALE_CLIENT_EVENT, onStale)
    return () => window.removeEventListener(STALE_CLIENT_EVENT, onStale)
  }, [])

  if (!needRefresh && !stale) return null

  return (
    <div
      role="alert"
      className="fixed left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-violet-600 px-4 py-3 text-sm text-white shadow-lg shadow-violet-900/30"
      style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      <span>{stale ? t('updateRequired') : t('updateAvailable')}</span>
      <Button variant="secondary" onClick={() => updateServiceWorker(true)}>
        {t('updateNow')}
      </Button>
    </div>
  )
}
