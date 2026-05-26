import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/presentation/components/common/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'eventsplit.installDismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true')
  // iOS: no beforeinstallprompt event — show the hint if it's iOS Safari and not installed
  const [showIosHint] = useState(() => isIos() && !isStandalone())

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

  if (dismissed || isStandalone()) return null

  // Android / desktop Chromium: native prompt available
  if (deferred) {
    return (
      <div
        role="region"
        aria-label={t('install.title')}
        className="flex items-center gap-3 bg-violet-600 px-4 py-2 text-sm text-white"
      >
        <span className="flex-1">{t('install.title')}</span>
        <Button variant="secondary" onClick={install}>
          {t('install.button')}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('install.dismiss')}
          className="rounded px-2 py-1 text-white/80 hover:bg-white/10"
        >
          ✕
        </button>
      </div>
    )
  }

  // iOS: instructions only (no programmatic install)
  if (showIosHint) {
    return (
      <div
        role="region"
        aria-label={t('install.title')}
        className="flex items-start gap-3 bg-slate-800 px-4 py-2 text-xs text-slate-200"
      >
        <span className="flex-1">{t('install.iosHint')}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('install.dismiss')}
          className="rounded px-2 py-1 text-slate-400 hover:bg-slate-700"
        >
          ✕
        </button>
      </div>
    )
  }

  return null
}
