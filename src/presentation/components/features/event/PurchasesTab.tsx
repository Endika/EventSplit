import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { Button } from '@/presentation/components/common/Button'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { PurchaseForm } from './PurchaseForm'

export function PurchasesTab() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PurchaseSnapshot | null>(null)
  if (!event) return null

  const visible = event.purchases.filter((p) => !p.deleted)
  const userName = (id: string) => event.users.find((u) => u.id === id)?.name ?? '?'

  return (
    <div className="space-y-3">
      {!adding && !editing && <Button onClick={() => setAdding(true)}>{t('purchases.add')}</Button>}
      {adding && <PurchaseForm onDone={() => setAdding(false)} />}
      {editing && <PurchaseForm purchase={editing} onDone={() => setEditing(null)} />}
      {visible.length === 0 && <p className="text-sm text-slate-400">{t('purchases.empty')}</p>}
      <ul className="space-y-2">
        {visible.map((p) => (
          <li key={p.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-slate-100">{p.item}</div>
                <div className="text-sm text-slate-400">
                  {t('purchases.totalQuantity', { n: p.totalQuantity, unit: t(`purchases.form.units.${p.unit}`) })}
                </div>
                <div className="text-xs text-slate-500">
                  {t('purchases.createdBy', { name: userName(p.createdBy) })}
                  <YouLabel userId={p.createdBy} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="rounded p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label={t('purchases.edit')}
                title={t('purchases.edit')}
              >
                ✎
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
