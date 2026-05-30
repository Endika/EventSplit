import { useTranslation } from 'react-i18next'
import type { AllergyMatch } from '@/domain/services/AllergyChecker'
import type { AllergenSeverity } from '@/domain/value-objects/Allergen'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'

function severityIcon(s: AllergenSeverity): string {
  return s === 'severe' ? '🔴' : s === 'moderate' ? '🚨' : '⚠️'
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
    <Modal open title={`⚠️ ${t('allergyAlert.title')}`} dismissable={false}>
      <div className="space-y-3">
        <p className="text-sm text-muted">{t('allergyAlert.item', { item })}</p>
        <ul className="space-y-2 rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger-soft-fg">
          {matches.map((m, i) => (
            <li key={`${m.userId}-${m.allergen}-${i}`} className="flex gap-2">
              <span>{severityIcon(m.severity)}</span>
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
