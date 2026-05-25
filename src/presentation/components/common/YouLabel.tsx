import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/presentation/context/UserContext'

export function YouLabel({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  if (!me || me.id !== userId) return null
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
      aria-label={t('common.you')}
    >
      {t('common.you')}
    </span>
  )
}
