import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import type { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { UserKind } from '@/domain/entities/User'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function AddParticipantModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const { guardedExecute } = useWriteGuard()
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [kind, setKind] = useState<UserKind>('adult')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!event) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!event) return
    guardedExecute(
      async () => {
        setBusy(true)
        setError(null)
        try {
          const handler = container.resolve<JoinAsNewUserHandler>('joinAsNewUser')
          const result = await handler.execute({
            eventId: event.id,
            name: name.trim(),
            alias: alias.trim() || null,
            kind,
          })
          container
            .resolve<LocalStorageCache>('cache')
            .set(event.id, { snapshot: result.event, version: result.version })
          setEvent(result.event, result.version)
          onClose()
        } catch (err) {
          console.error('[AddParticipant]', err)
          setError(err instanceof Error ? err.message : 'Error')
        } finally {
          setBusy(false)
        }
      },
      (err) => {
        console.error('[AddParticipant]', err)
        setError(err instanceof Error ? err.message : 'Error')
        setBusy(false)
      },
    )
  }

  return (
    <Modal open title={t('participants.addTitle')} dismissable={!busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input
          placeholder={t('participants.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={50}
          autoFocus
        />
        <Input
          placeholder={t('participants.alias')}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={50}
        />
        <label className="block text-sm text-slate-300">
          {t('participants.kind')}
          <select
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
            value={kind}
            onChange={(e) => setKind(e.target.value as UserKind)}
            disabled={busy}
          >
            <option value="adult">{t('participants.adult')}</option>
            <option value="child">{t('participants.child')}</option>
          </select>
        </label>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy || name.trim().length < 2}>
            {t('participants.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
