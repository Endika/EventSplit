import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/presentation/components/common/Button'
import { IconClose } from '@/presentation/components/common/icons'
import { installBanner, isIosUserAgent, isStandaloneDisplay } from '@/presentation/utils/pwaInstall'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'eventsplit.installDismissed'

function isStandalone(): boolean {
  return isStandaloneDisplay(
    window.matchMedia('(display-mode: standalone)').matches,
    (window.navigator as unknown as { standalone?: boolean }).standalone,
  )
}

export function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true')
  // iOS: no beforeinstallprompt event — show the hint if it's iOS Safari and not installed
  const [showIosHint] = useState(
    () => isIosUserAgent(window.navigator.userAgent) && !isStandalone(),
  )

  useEffect(() => {
    if (isStandalone()) return
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  const banner = installBanner({
    dismissed,
    standalone: isStandalone(),
    canPrompt: deferred !== null,
    iosHint: showIosHint,
  })

  // Android / desktop Chromium: native prompt available
  if (banner === 'native') {
    return (
      <div
        role="region"
        aria-label={t('install.title')}
        className="flex items-center gap-3 bg-brand-soft px-4 py-2 text-sm text-brand-soft-fg"
      >
        <span className="flex-1">{t('install.title')}</span>
        <Button variant="secondary" onClick={install}>
          {t('install.button')}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('install.dismiss')}
          className="flex size-11 shrink-0 items-center justify-center text-brand-soft-fg/70 hover:bg-brand/10"
        >
          <IconClose className="size-4" />
        </button>
      </div>
    )
  }

  // iOS: instructions only (no programmatic install)
  if (banner === 'ios') {
    return (
      <div
        role="region"
        aria-label={t('install.title')}
        className="flex items-start gap-3 bg-elevated px-4 py-2 text-xs text-ink"
      >
        <span className="flex-1">{t('install.iosHint')}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('install.dismiss')}
          className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-surface"
        >
          <IconClose className="size-4" />
        </button>
      </div>
    )
  }

  return null
}
