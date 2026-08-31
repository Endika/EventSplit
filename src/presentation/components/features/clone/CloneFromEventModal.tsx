import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CloneIntoEventHandler } from '@/application/handlers/CloneIntoEventHandler'
import type { CloneSelection } from '@/domain/services/buildClonePatch'
import type { EventSnapshot } from '@/domain/entities/Event'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { useCloneSources } from '@/presentation/hooks/useCloneSources'
import { friendlyError } from '@/presentation/utils/friendlyError'
import { reportError } from '@/shared/utils/reportError'
import { Button } from '@/presentation/components/common/Button'
import { Modal } from '@/presentation/components/common/Modal'
import { CloneSourcePicker } from './CloneSourcePicker'
import { CloneBlockTree } from './CloneBlockTree'

const EMPTY: CloneSelection = {
  dayOptions: false,
  userIds: [],
  mergeUserIds: [],
  purchaseIds: [],
  site: { location: false, emergencyContact: false, wifiPassword: false, generalNotes: false },
}

function isEmpty(selection: CloneSelection): boolean {
  return (
    !selection.dayOptions &&
    selection.userIds.length === 0 &&
    selection.purchaseIds.length === 0 &&
    !Object.values(selection.site).some(Boolean)
  )
}

/** Bring blocks over from another event: pick the source, then tick what you want. */
export function CloneFromEventModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()

  const [sourceId, setSourceId] = useState<string | null>(null)
  const [selection, setSelection] = useState<CloneSelection>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sources = useCloneSources(event?.id ?? '')

  // The source is already in the local cache — reading it costs no egress.
  const sourceSnapshot = useMemo<EventSnapshot | null>(() => {
    if (!sourceId) return null
    try {
      return new LocalStorageCache().get(sourceId)?.snapshot ?? null
    } catch {
      return null
    }
  }, [sourceId])

  if (!open || !event) return null

  function pickSource(id: string) {
    setSourceId(id)
    setSelection(EMPTY)
    setError(null)
  }

  function clone() {
    if (!me || !sourceId) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<CloneIntoEventHandler>('cloneIntoEvent')
        const result = await handler.execute({
          targetEventId: event!.id,
          sourceEventId: sourceId,
          clonedBy: me.id,
          selection,
        })
        setEvent(result.event, result.version)
        setSourceId(null)
        setSelection(EMPTY)
        onClose()
      } catch (err) {
        reportError('CloneFromEventModal', err)
        setError(friendlyError(err, t))
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <Modal open title={t('clone.title')} dismissable={!busy} onClose={onClose}>
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('clone.step1')}
          </h3>
          <CloneSourcePicker sources={sources} value={sourceId} onChange={pickSource} />
        </section>

        {sourceSnapshot && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('clone.step2')}
            </h3>
            <CloneBlockTree
              source={sourceSnapshot}
              target={event}
              selection={selection}
              onChange={setSelection}
            />
          </section>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={clone}
            disabled={busy || !me || !sourceSnapshot || isEmpty(selection)}
          >
            {busy ? t('clone.cloning') : t('clone.clone')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
