import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserSnapshot } from '@/domain/entities/User'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export interface IdentificationResult {
  kind: 'pick' | 'new'
  pickedUser?: UserSnapshot
  newUser?: { name: string; alias: string | null }
}

export function IdentificationModal({
  eventName,
  users,
  onConfirm,
}: {
  eventName: string
  users: UserSnapshot[]
  onConfirm: (r: IdentificationResult) => Promise<void>
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameCollision = users.some(
    (u) => u.name.trim().toLowerCase() === name.trim().toLowerCase(),
  )

  async function submitNew(e: FormEvent) {
    e.preventDefault()
    if (nameCollision && !alias.trim()) {
      setError(t('id.nameNeedsAlias', { name: name.trim() }))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onConfirm({ kind: 'new', newUser: { name: name.trim(), alias: alias.trim() || null } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  async function pick(u: UserSnapshot) {
    setBusy(true)
    setError(null)
    try {
      await onConfirm({ kind: 'pick', pickedUser: u })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title={t('id.who', { eventName })} dismissable={false}>
      {mode === 'list' && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">{t('id.pick')}</p>
          {users.map((u) => (
            <Button
              key={u.id}
              variant="secondary"
              className="block w-full text-left"
              onClick={() => pick(u)}
              disabled={busy}
            >
              {u.alias ? `${u.name} (${u.alias})` : u.name}
            </Button>
          ))}
          <hr className="my-3 border-slate-700" />
          <Button onClick={() => setMode('new')} disabled={busy}>
            {t('id.imNew')}
          </Button>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
      )}
      {mode === 'new' && (
        <form onSubmit={submitNew} className="space-y-3">
          <Input
            placeholder={t('id.myName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            autoFocus
          />
          <Input
            placeholder={t('id.myAlias')}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={50}
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode('list')} disabled={busy}>
              {t('id.back')}
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              {t('id.confirm')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
