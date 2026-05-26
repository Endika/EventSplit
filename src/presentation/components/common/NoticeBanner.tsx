import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NOTICE_EVENT, type Notice } from '@/shared/utils/notify'

export function NoticeBanner() {
  const { t } = useTranslation()
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    function onNotice(e: Event) {
      setNotice((e as CustomEvent<Notice>).detail)
    }
    window.addEventListener(NOTICE_EVENT, onNotice)
    return () => window.removeEventListener(NOTICE_EVENT, onNotice)
  }, [])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(id)
  }, [notice])

  if (!notice) return null

  return (
    <div
      role="status"
      className="fixed inset-x-2 z-[55] mx-auto max-w-md rounded-lg border border-teal-700 bg-teal-950/95 p-3 text-sm text-teal-100 shadow-xl backdrop-blur"
      style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {t(notice.key)}
    </div>
  )
}
