import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '@/presentation/context/SyncContext'

export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      className="bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      {t('offline')}
    </div>
  )
}
