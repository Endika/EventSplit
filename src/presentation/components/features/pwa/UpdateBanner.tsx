import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/presentation/components/common/Button'

const UPDATE_CHECK_INTERVAL_MS = 60_000

export function UpdateBanner() {
  const { t } = useTranslation()
  const [available, setAvailable] = useState(false)
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh: () => setAvailable(true),
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

  if (!available) return null
  return (
    <div
      className="fixed left-1/2 z-40 -translate-x-1/2 rounded-lg bg-violet-600 px-4 py-3 text-sm text-white shadow-lg shadow-violet-900/30"
      style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      <span className="mr-3">{t('updateAvailable')}</span>
      <Button variant="secondary" onClick={() => updateServiceWorker(true)}>
        {t('updateNow')}
      </Button>
    </div>
  )
}
