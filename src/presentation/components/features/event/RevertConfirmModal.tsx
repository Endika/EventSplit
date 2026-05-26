import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import type { HistoryEntry } from '@/domain/entities/Event'
import type { RevertHandler } from '@/application/handlers/RevertHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { reportError } from '@/shared/utils/reportError'

export function RevertConfirmModal({
  entry,
  onClose,
}: {
  entry: HistoryEntry
  onClose: () => void
}) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!event || !me) return null

  const latestVersion = event.history.at(-1)?.version ?? 0
  const count = Math.max(0, latestVersion - entry.version)

  async function doRevert() {
    if (!event || !me) return
    setBusy(true)
    setError(null)
    try {
      const handler = container.resolve<RevertHandler>('revert')
      const result = await handler.execute({
        eventId: event.id,
        userId: me.id,
        targetVersion: entry.version,
      })
      container
        .resolve<LocalStorageCache>('cache')
        .set(event.id, { snapshot: result.event, version: result.version })
      setEvent(result.event, result.version)
      onClose()
    } catch (err) {
      reportError('Revert', err)
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title={t('history.revert.title')} dismissable={!busy} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          {t('history.revert.summary', { count, version: entry.version })}
        </p>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('history.revert.cancel')}
          </Button>
          <Button type="button" onClick={doRevert} disabled={busy}>
            {busy ? '…' : t('history.revert.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
