import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/presentation/context/UserContext'

export function YouLabel({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  if (!me || me.id !== userId) return null
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-fg"
      aria-label={t('common.you')}
    >
      {t('common.you')}
    </span>
  )
}
