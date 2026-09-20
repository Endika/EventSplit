import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { IconCheck } from '@/presentation/components/common/icons'
import { formatShoppingListText } from '@/presentation/utils/formatShoppingListText'
import type { EventSnapshot } from '@/domain/entities/Event'
import { reportError } from '@/shared/utils/reportError'

export function ShareListModal({
  open,
  event,
  onClose,
}: {
  open: boolean
  event: EventSnapshot
  onClose: () => void
}) {
  const { t } = useTranslation()
  const text = useMemo(() => formatShoppingListText(event, t), [event, t])
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      reportError('ShareListModal.copy', err)
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ text })
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        reportError('ShareListModal.share', err)
      }
    }
  }

  return (
    <Modal open={open} title={t('share.modal.title')} onClose={onClose}>
      <pre className="mb-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm text-ink ring-1 ring-border">
        {text}
      </pre>
      <div className="flex flex-wrap gap-2 justify-end">
        {canShare && (
          <Button variant="primary" onClick={handleShare}>
            {t('share.modal.share')}
          </Button>
        )}
        <Button variant="primary" onClick={handleCopy}>
          {copied && <IconCheck className="size-4" />}
          {copied ? t('share.modal.copied') : t('share.modal.copy')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('share.modal.close')}
        </Button>
      </div>
    </Modal>
  )
}
