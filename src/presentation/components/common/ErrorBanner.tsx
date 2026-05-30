import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ERROR_EVENT, type ReportedError } from '@/shared/utils/reportError'

export function ErrorBanner() {
  const { t } = useTranslation()
  const [error, setError] = useState<ReportedError | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onError(e: Event) {
      const detail = (e as CustomEvent<ReportedError>).detail
      setError(detail)
      setCopied(false)
    }
    window.addEventListener(ERROR_EVENT, onError)
    return () => window.removeEventListener(ERROR_EVENT, onError)
  }, [])

  if (!error) return null

  const fullText = `[${error.context}] ${error.name}: ${error.message}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-2 z-[60] rounded-xl border border-danger bg-danger-soft p-3 text-xs shadow-xl backdrop-blur"
      style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold text-danger-soft-fg">
          {t('errorBanner.title')} · {error.context}
        </span>
        <button
          type="button"
          onClick={() => setError(null)}
          aria-label={t('errorBanner.dismiss')}
          className="rounded px-2 py-0.5 text-danger hover:bg-elevated hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="break-all text-danger-soft-fg">
        <span className="font-medium">{error.name}:</span> {error.message}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded bg-elevated px-2 py-1 text-danger-soft-fg hover:bg-border"
        >
          {copied ? t('errorBanner.copied') : t('errorBanner.copy')}
        </button>
      </div>
    </div>
  )
}
