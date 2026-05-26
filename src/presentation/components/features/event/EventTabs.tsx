import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { ParticipantsTab } from './ParticipantsTab'
import { AvailabilityTab } from './AvailabilityTab'
import { LocationTab } from './LocationTab'
import { PurchasesTab } from './PurchasesTab'
import { ExpensesTab } from './ExpensesTab'
import { HistoryTab } from './HistoryTab'

type Tab = 'participants' | 'availability' | 'location' | 'purchases' | 'expenses' | 'history'

const TAB_ICONS: Record<Tab, string> = {
  participants: '👥',
  availability: '📅',
  location: '📍',
  purchases: '🛒',
  expenses: '💰',
  history: '📜',
}

export function EventTabs() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const [active, setActive] = useState<Tab>('participants')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'participants', label: t('tabs.participants') },
    { key: 'availability', label: t('tabs.availability') },
    { key: 'location', label: t('tabs.location') },
    { key: 'purchases', label: t('tabs.purchases') },
    { key: 'expenses', label: t('tabs.expenses') },
    { key: 'history', label: t('tabs.history') },
  ]

  function selectTab(key: Tab) {
    setActive(key)
    setDrawerOpen(false)
  }

  function goHome() {
    window.history.pushState({}, '', import.meta.env.BASE_URL)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <>
      {/* MOBILE — sticky top bar with hamburger */}
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('tabs.openMenu')}
          className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="flex-1 truncate text-base font-semibold text-slate-100">
          {event?.name ?? ''}
        </h1>
        <button
          type="button"
          onClick={goHome}
          aria-label={t('tabs.home')}
          title={t('tabs.home')}
          className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
        </button>
      </header>

      {/* MOBILE — slide-out drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('tabs.menu')}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="truncate text-sm font-semibold text-slate-100">
                {event?.name ?? ''}
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t('tabs.closeMenu')}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <nav className="py-2">
              {tabs.map((tab) => {
                const isActive = active === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => selectTab(tab.key)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
                      isActive
                        ? 'bg-violet-900/30 text-violet-200'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-lg" aria-hidden="true">{TAB_ICONS[tab.key]}</span>
                    <span className="flex-1">{tab.label}</span>
                    {isActive && <span aria-hidden="true">›</span>}
                  </button>
                )
              })}
              <div className="my-2 border-t border-slate-800" />
              <button
                type="button"
                onClick={goHome}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800"
              >
                <span className="text-lg" aria-hidden="true">🏠</span>
                <span>{t('tabs.home')}</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* DESKTOP — horizontal nav */}
      <nav className="mb-4 hidden gap-2 overflow-x-auto border-b border-slate-800 md:flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium ${
              active === tab.key
                ? 'border-b-2 border-violet-400 text-violet-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {active === 'participants' && <ParticipantsTab />}
      {active === 'availability' && <AvailabilityTab />}
      {active === 'location' && <LocationTab />}
      {active === 'purchases' && <PurchasesTab />}
      {active === 'expenses' && <ExpensesTab />}
      {active === 'history' && <HistoryTab />}
    </>
  )
}
