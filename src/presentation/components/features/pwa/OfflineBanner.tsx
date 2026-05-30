import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '@/presentation/context/SyncContext'

export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      className="bg-warn-soft px-4 py-2 text-center text-sm font-medium text-warn-soft-fg"
    >
      {t('offline')}
    </div>
  )
}
