import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventSnapshot } from '@/domain/entities/Event'
import { RateLimitedError } from '@/domain/repositories/IEventRepository'
import type { VerifyPinHandler } from '@/application/handlers/VerifyPinHandler'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEditPin } from '@/presentation/context/EditPinContext'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function EventPinGate({ event, onUnlock }: { event: EventSnapshot; onUnlock: () => void }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { setPin: setUnlockedPin } = useEditPin()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!event.hasPin) {
      onUnlock()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const ok = await container.resolve<VerifyPinHandler>('verifyPin').execute(event.id, pin)
      if (!ok) {
        setError(t('pin.gateWrong'))
        setPin('')
        return
      }
      // Keep the verified PIN for the session so privileged actions can pass it
      // server-side; this also flips EventPage's gate (no localStorage flag).
      setUnlockedPin(pin)
      onUnlock()
    } catch (err) {
      setError(err instanceof RateLimitedError ? t('pin.tooManyAttempts') : t('pin.gateWrong'))
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <div className="mb-2 text-3xl">🔒</div>
        <h1 className="mb-1 text-lg font-semibold text-ink">{event.name}</h1>
        <p className="mb-4 text-sm text-muted">{t('pin.gateBody')}</p>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            placeholder={t('pin.gateField')}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            disabled={busy}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy || pin.length < 4} className="w-full">
            {t('pin.gateUnlock')}
          </Button>
        </form>
      </div>
    </main>
  )
}
