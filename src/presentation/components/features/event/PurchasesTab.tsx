import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { Button } from '@/presentation/components/common/Button'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { PurchaseForm } from './PurchaseForm'

export function PurchasesTab() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const [adding, setAdding] = useState(false)
  if (!event) return null

  const visible = event.purchases.filter((p) => !p.deleted)
  const userName = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="space-y-3">
      {!adding && <Button onClick={() => setAdding(true)}>{t('purchases.add')}</Button>}
      {adding && <PurchaseForm onDone={() => setAdding(false)} />}
      {visible.length === 0 && <p className="text-sm text-gray-500">{t('purchases.empty')}</p>}
      <ul className="space-y-2">
        {visible.map((p) => (
          <li key={p.id} className="rounded-lg border p-3">
            <div className="font-medium">{p.item}</div>
            <div className="text-sm text-gray-600">
              {t('purchases.totalQuantity', { n: p.totalQuantity, unit: p.unit })}
            </div>
            <div className="text-xs text-gray-500">
              {t('purchases.createdBy', { name: userName(p.createdBy) })}
              <YouLabel userId={p.createdBy} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
