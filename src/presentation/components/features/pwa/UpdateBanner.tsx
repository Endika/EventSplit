import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/presentation/components/common/Button'
import { STALE_CLIENT_EVENT } from '@/shared/utils/staleClient'

const UPDATE_CHECK_INTERVAL_MS = 60_000

/**
 * With registerType: 'autoUpdate' a new service worker activates silently and is
 * picked up on the next navigation — there is no routine "update available"
 * prompt. This banner only handles the forced case: the server rejected a write
 * because this build's schema is older than the stored event (StaleClientError →
 * STALE_CLIENT_EVENT). It stays until the user reloads to the current build.
 */
export function UpdateBanner() {
  const { t } = useTranslation()
  const [stale, setStale] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW: (_swUrl, reg) => setRegistration(reg ?? null),
  })

  // Poll for a new service worker while the app stays open so long-lived PWA
  // installs don't sit on a stale build. Cleared on unmount to avoid leaks.
  useEffect(() => {
    if (!registration) return
    const id = setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [registration])

  useEffect(() => {
    const onStale = () => setStale(true)
    window.addEventListener(STALE_CLIENT_EVENT, onStale)
    return () => window.removeEventListener(STALE_CLIENT_EVENT, onStale)
  }, [])

  if (!stale) return null

  return (
    <div
      role="alert"
      className="fixed left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn-soft-fg shadow-lg"
      style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      <span>{t('updateRequired')}</span>
      <Button variant="secondary" onClick={() => updateServiceWorker(true)}>
        {t('updateNow')}
      </Button>
    </div>
  )
}
