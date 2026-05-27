import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventSnapshot } from '@/domain/entities/Event'
import { EditPin } from '@/domain/value-objects/EditPin'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function EventPinGate({ event, onUnlock }: { event: EventSnapshot; onUnlock: () => void }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!event.editPin) {
      onUnlock()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const ok = await EditPin.verify(pin, event.editPin, event.id)
      if (!ok) {
        setError(t('pin.gateWrong'))
        setPin('')
        return
      }
      localStorage.setItem(`eventsplit.pin.${event.id}`, 'true')
      onUnlock()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <div className="mb-2 text-3xl">🔒</div>
        <h1 className="mb-1 text-lg font-semibold text-slate-100">{event.name}</h1>
        <p className="mb-4 text-sm text-slate-400">{t('pin.gateBody')}</p>
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
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" disabled={busy || pin.length < 4} className="w-full">
            {t('pin.gateUnlock')}
          </Button>
        </form>
      </div>
    </main>
  )
}
