import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { useEditPin } from '@/presentation/context/EditPinContext'
import { RateLimitedError } from '@/domain/repositories/IEventRepository'
import type { VerifyPinHandler } from '@/application/handlers/VerifyPinHandler'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { reportError } from '@/shared/utils/reportError'

export function PinPromptModal() {
  const { t } = useTranslation()
  const container = useContainer()
  const { event } = useEventState()
  const { pending, clearPending } = useWriteGuard()
  const { setPin: setUnlockedPin } = useEditPin()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!pending || !event || !event.hasPin) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!event?.hasPin || !pending) return
    setBusy(true)
    setError(null)
    try {
      const ok = await container.resolve<VerifyPinHandler>('verifyPin').execute(event.id, pin)
      if (!ok) {
        setError(t('pin.wrongPin'))
        setPin('')
        return
      }
      // Persist the verified PIN so privileged actions can pass it server-side;
      // this also flips WriteGuard's `verified` flag.
      setUnlockedPin(pin)
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
        reportError('PinPrompt', err)
        onError(err)
      }
    } catch (err) {
      setError(err instanceof RateLimitedError ? t('pin.tooManyAttempts') : t('pin.wrongPin'))
      setPin('')
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
        <p className="text-sm text-muted">{t('pin.promptHint')}</p>
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
        {error && <p className="text-sm text-danger">{error}</p>}
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
