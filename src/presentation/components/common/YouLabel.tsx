import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/presentation/context/UserContext'

export function YouLabel({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  if (!me || me.id !== userId) return null
  return (
    <span
      className="ml-2 inline-flex shrink-0 items-center bg-brand px-1.5 py-px text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white dark:text-bg"
      aria-label={t('common.you')}
    >
      {t('common.you')}
    </span>
  )
}
