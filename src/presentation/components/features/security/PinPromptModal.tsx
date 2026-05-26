import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { EditPin } from '@/domain/value-objects/EditPin'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function PinPromptModal() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const { pending, markVerified, clearPending } = useWriteGuard()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!pending || !event || !event.editPin) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!event?.editPin || !pending) return
    setBusy(true)
    setError(null)
    try {
      const ok = await EditPin.verify(pin, event.editPin, event.id)
      if (!ok) {
        setError(t('pin.wrongPin'))
        setPin('')
        return
      }
      markVerified()
      const fn = pending.fn
      const onError = pending.onError
      clearPending()
      // After clearing pending, run the queued action
      try {
        const result = fn()
        if (result instanceof Promise) {
          await result
        }
      } catch (err) {
        onError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    clearPending()
    setPin('')
  }

  return (
    <Modal open title={t('pin.promptTitle')} dismissable={!busy} onClose={cancel}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-slate-400">{t('pin.promptHint')}</p>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          placeholder={t('pin.promptField')}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          disabled={busy}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={cancel} disabled={busy}>
            {t('pin.promptCancel')}
          </Button>
          <Button type="submit" disabled={busy || pin.length < 4}>
            {t('pin.promptSubmit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
