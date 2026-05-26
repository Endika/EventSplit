import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/presentation/components/common/Button'

export function UpdateBanner() {
  const { t } = useTranslation()
  const [available, setAvailable] = useState(false)
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh: () => setAvailable(true),
    onOfflineReady: () => {},
  })

  if (!available) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-violet-600 px-4 py-3 text-sm text-white shadow-lg shadow-violet-900/30">
      <span className="mr-3">{t('updateAvailable')}</span>
      <Button variant="secondary" onClick={() => updateServiceWorker(true)}>
        {t('updateNow')}
      </Button>
    </div>
  )
}
