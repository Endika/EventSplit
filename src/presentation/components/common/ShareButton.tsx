import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconShare } from '@/presentation/components/common/icons'

/**
 * Sharing an event lived twice — once in the desktop header, once in the mobile
 * one — and both copies ended in `window.alert`, labelled "for MVP". One
 * component now owns the behaviour and says what happened in the page's own
 * voice instead of a browser dialog that blocks everything behind it.
 */
export function ShareButton({
  eventName,
  className = '',
}: {
  eventName: string
  className?: string
}) {
  const { t } = useTranslation()
  const [notice, setNotice] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  function announce(message: string) {
    if (timer.current) clearTimeout(timer.current)
    setNotice(message)
    timer.current = setTimeout(() => setNotice(null), 3000)
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: eventName || t('event.shareTitle'), url })
        return
      }
      await navigator.clipboard.writeText(url)
      announce(t('event.shareCopied'))
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return // the person cancelled
      console.error('[Share]', err)
      announce(t('event.shareNotSupported'))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={t('event.share')}
        title={t('event.share')}
        className={`flex min-h-11 items-center justify-center gap-1 text-ink hover:bg-elevated ${className}`}
      >
        <IconShare />
      </button>
      {notice && (
        <p
          role="status"
          className="fixed inset-x-0 bottom-16 z-40 mx-auto w-max max-w-[90vw] bg-promo px-3 py-2 text-sm font-semibold text-promo-fg md:bottom-4"
        >
          {notice}
        </p>
      )}
    </>
  )
}
