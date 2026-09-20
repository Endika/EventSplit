import { useTranslation } from 'react-i18next'
import type { AllergyMatch } from '@/domain/services/AllergyChecker'
import type { AllergenSeverity } from '@/domain/value-objects/Allergen'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { IconAlert } from '@/presentation/components/common/icons'

/** One mark, three tones: the severity is also spelled out on the line. */
const SEVERITY_TONE: Record<AllergenSeverity, string> = {
  severe: 'text-danger',
  moderate: 'text-warn',
  mild: 'text-muted',
}

export function AllergyAlertModal({
  item,
  matches,
  onContinue,
  onCancel,
}: {
  item: string
  matches: AllergyMatch[]
  onContinue: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal
      open
      title={
        <span className="flex items-center gap-2 text-danger">
          <IconAlert className="size-5" />
          {t('allergyAlert.title')}
        </span>
      }
      dismissable={false}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">{t('allergyAlert.item', { item })}</p>
        <ul className="space-y-2 rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger-soft-fg">
          {matches.map((m, i) => (
            <li key={`${m.userId}-${m.allergen}-${i}`} className="flex gap-2">
              <IconAlert className={`mt-0.5 size-4 shrink-0 ${SEVERITY_TONE[m.severity]}`} />
              <span>
                {t('allergyAlert.warning', {
                  user: m.displayName,
                  allergen: t(`allergens.${m.allergen}`),
                })}{' '}
                — {t(`allergens.severity.${m.severity}`)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('allergyAlert.changeItem')}
          </Button>
          <Button type="button" onClick={onContinue}>
            {t('allergyAlert.continue')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
