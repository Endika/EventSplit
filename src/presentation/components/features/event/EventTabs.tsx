import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ParticipantsTab } from './ParticipantsTab'
import { PurchasesTab } from './PurchasesTab'
import { ExpensesTab } from './ExpensesTab'

type Tab = 'participants' | 'purchases' | 'expenses'

export function EventTabs() {
  const { t } = useTranslation()
  const [active, setActive] = useState<Tab>('participants')
  const tabs: { key: Tab; label: string }[] = [
    { key: 'participants', label: t('tabs.participants') },
    { key: 'purchases', label: t('tabs.purchases') },
    { key: 'expenses', label: t('tabs.expenses') },
  ]
  return (
    <div>
      <nav className="mb-4 flex gap-2 border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium ${
              active === tab.key
                ? 'border-b-2 border-violet-400 text-violet-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {active === 'participants' && <ParticipantsTab />}
      {active === 'purchases' && <PurchasesTab />}
      {active === 'expenses' && <ExpensesTab />}
    </div>
  )
}
