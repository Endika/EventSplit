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
      className="fixed inset-x-2 z-[60] rounded-lg border border-rose-700 bg-rose-950/95 p-3 text-xs shadow-xl backdrop-blur"
      style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold text-rose-200">
          {t('errorBanner.title')} · {error.context}
        </span>
        <button
          type="button"
          onClick={() => setError(null)}
          aria-label={t('errorBanner.dismiss')}
          className="rounded px-2 py-0.5 text-rose-300 hover:bg-rose-900 hover:text-rose-100"
        >
          ✕
        </button>
      </div>
      <div className="break-all text-rose-100">
        <span className="font-medium">{error.name}:</span> {error.message}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded bg-rose-800 px-2 py-1 text-rose-100 hover:bg-rose-700"
        >
          {copied ? t('errorBanner.copied') : t('errorBanner.copy')}
        </button>
      </div>
    </div>
  )
}
