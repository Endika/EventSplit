import { lazy, Suspense, useRef, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { StageSelector } from './StageSelector'
import { ShareButton } from '@/presentation/components/common/ShareButton'
import {
  IconCalendar,
  IconCart,
  IconChevron,
  IconClose,
  IconHistory,
  IconHome,
  IconLocation,
  IconMoney,
  IconUsers,
  type IconProps,
} from '@/presentation/components/common/icons'

const ParticipantsTab = lazy(() =>
  import('./ParticipantsTab').then((m) => ({ default: m.ParticipantsTab })),
)
const AvailabilityTab = lazy(() =>
  import('./AvailabilityTab').then((m) => ({ default: m.AvailabilityTab })),
)
const LocationTab = lazy(() => import('./LocationTab').then((m) => ({ default: m.LocationTab })))
const PurchasesTab = lazy(() => import('./PurchasesTab').then((m) => ({ default: m.PurchasesTab })))
const ExpensesTab = lazy(() => import('./ExpensesTab').then((m) => ({ default: m.ExpensesTab })))
const HistoryTab = lazy(() => import('./HistoryTab').then((m) => ({ default: m.HistoryTab })))

type Tab = 'participants' | 'availability' | 'location' | 'purchases' | 'expenses' | 'history'

function defaultTabForStage(stage: string | undefined): Tab {
  if (stage === 'shopping') return 'purchases'
  if (stage === 'expenses') return 'expenses'
  if (stage === 'doodle') return 'availability'
  return 'participants'
}

const TAB_ICONS: Record<Tab, ComponentType<IconProps>> = {
  participants: IconUsers,
  availability: IconCalendar,
  location: IconLocation,
  purchases: IconCart,
  expenses: IconMoney,
  history: IconHistory,
}

export function EventTabs() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const [active, setActive] = useState<Tab>(() => defaultTabForStage(event?.stage))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'participants', label: t('tabs.participants') },
    { key: 'availability', label: t('tabs.availability') },
    { key: 'location', label: t('tabs.location') },
    { key: 'purchases', label: t('tabs.purchases') },
    { key: 'expenses', label: t('tabs.expenses') },
    { key: 'history', label: t('tabs.history') },
  ]

  const activeIndex = tabs.findIndex((tab) => tab.key === active)

  // Four fixed destinations in the thumb's arc, led by whatever the current
  // phase is for; the rest live behind the menu. The app is used standing up,
  // one-handed, so the common moves must not need a drawer.
  const barKeys: Tab[] = [
    ...new Set<Tab>([
      defaultTabForStage(event?.stage),
      'participants',
      'purchases',
      'expenses',
      'availability',
    ]),
  ].slice(0, 4)
  const barTabs = barKeys.map((key) => ({
    key,
    label: key === 'purchases' ? t('tabs.purchasesShort') : t(`tabs.${key}`),
  }))

  function selectTab(key: Tab) {
    setActive(key)
    setDrawerOpen(false)
  }

  function goToIndex(i: number) {
    if (i < 0 || i >= tabs.length) return
    setActive(tabs[i]!.key)
  }

  // Horizontal swipe to move between tabs (mobile). Vertical swipes and
  // horizontally-scrollable regions (marked data-no-swipe) are ignored.
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[data-no-swipe]')) {
      touchStart.current = null
      return
    }
    const point = e.touches[0]
    if (!point) return
    touchStart.current = { x: point.clientX, y: point.clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const point = e.changedTouches[0]
    if (!point) return
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (Math.abs(dx) < 70) return // not far enough
    if (Math.abs(dx) < Math.abs(dy) * 1.8) return // mostly vertical → ignore
    if (dx < 0)
      goToIndex(activeIndex + 1) // swipe left → next tab
    else goToIndex(activeIndex - 1) // swipe right → previous tab
  }

  function goHome() {
    window.history.pushState({}, '', import.meta.env.BASE_URL)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <>
      {/* MOBILE — sticky top bar with hamburger */}
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('tabs.openMenu')}
          className="flex size-11 items-center justify-center text-ink hover:bg-elevated"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="flex-1 truncate text-base font-semibold text-ink">{event?.name ?? ''}</h1>
        <ShareButton eventName={event?.name ?? ''} className="size-11 shrink-0" />
        <button
          type="button"
          onClick={goHome}
          aria-label={t('tabs.home')}
          title={t('tabs.home')}
          className="flex size-11 items-center justify-center text-ink hover:bg-elevated"
        >
          <IconHome />
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
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="truncate text-sm font-semibold text-ink">{event?.name ?? ''}</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t('tabs.closeMenu')}
                className="flex size-11 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
              >
                <IconClose className="size-4" />
              </button>
            </div>
            <div className="border-b border-border px-4 py-3">
              <StageSelector />
            </div>
            <nav className="py-2">
              {tabs.map((tab) => {
                const isActive = active === tab.key
                const Mark = TAB_ICONS[tab.key]
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => selectTab(tab.key)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
                      isActive ? 'bg-brand-soft text-brand-soft-fg' : 'text-ink hover:bg-elevated'
                    }`}
                  >
                    <Mark className="size-5 shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                    {isActive && <IconChevron className="size-4 shrink-0" />}
                  </button>
                )
              })}
              <div className="my-2 border-t border-border" />
              <button
                type="button"
                onClick={goHome}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-elevated"
              >
                <IconHome className="size-5 shrink-0" />
                <span>{t('tabs.home')}</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* DESKTOP — stage selector */}
      <div className="mb-3 hidden md:block">
        <StageSelector />
      </div>

      {/* DESKTOP — horizontal nav */}
      <nav className="mb-4 hidden gap-2 overflow-x-auto border-b-2 border-rail md:flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium ${
              active === tab.key ? 'bg-brand text-white dark:text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* MOBILE — fixed bottom bar, inside the thumb's arc */}
      <nav
        aria-label={t('tabs.menu')}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-rail bg-surface pb-[var(--safe-bottom)] md:hidden"
      >
        {barTabs.map((tab) => {
          const Mark = TAB_ICONS[tab.key]
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 ${
                isActive ? 'bg-brand text-white dark:text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              <Mark className="size-5 shrink-0" />
              <span className="w-full truncate text-[10px] font-semibold uppercase tracking-wide">
                {tab.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-muted hover:text-ink"
        >
          <IconChevron dir="up" className="size-5 shrink-0" />
          <span className="w-full truncate text-[10px] font-semibold uppercase tracking-wide">
            {t('tabs.menu')}
          </span>
        </button>
      </nav>

      {/* Tab content (swipe left/right to change tab on touch devices) */}
      <div className="pb-36 md:pb-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Suspense fallback={<div className="p-6 text-center text-muted">…</div>}>
          {active === 'participants' && <ParticipantsTab />}
          {active === 'availability' && <AvailabilityTab />}
          {active === 'location' && <LocationTab />}
          {active === 'purchases' && <PurchasesTab />}
          {active === 'expenses' && <ExpensesTab />}
          {active === 'history' && <HistoryTab />}
        </Suspense>
      </div>
    </>
  )
}
