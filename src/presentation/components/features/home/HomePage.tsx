import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useOnlineStatus } from '@/presentation/context/SyncContext'
import type { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import type { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import type {
  LocalStorageCache,
  CachedEventSummary,
} from '@/infrastructure/persistence/LocalStorageCache'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { RecentEventsList } from './RecentEventsList'
import { reportError } from '@/shared/utils/reportError'

export function HomePage() {
  const { t } = useTranslation()
  const container = useContainer()
  const online = useOnlineStatus()
  const cache = container.resolve<LocalStorageCache>('cache')

  const [items, setItems] = useState<CachedEventSummary[]>(() => cache.listAll())
  const [creating, setCreating] = useState(items.length === 0)

  const [name, setName] = useState('')
  const [yourName, setYourName] = useState('')
  const [alias, setAlias] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function forget(id: string) {
    cache.remove(id)
    const next = cache.listAll()
    setItems(next)
    if (next.length === 0) setCreating(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const handler = container.resolve<CreateEventHandler>('createEvent')
      const result = await handler.execute({
        name,
        creatorName: yourName,
        creatorAlias: alias || null,
      })
      cache.set(result.event.id, { snapshot: result.event, version: result.version })
      cache.setIdentity(result.event.id, {
        id: result.creator.id,
        name: yourName.trim(),
        alias: alias.trim() || null,
      })
      if (pin.length >= 4 && pin.length <= 6) {
        const pinHandler = container.resolve<SetEditPinHandler>('setEditPin')
        await pinHandler.execute({
          eventId: result.event.id,
          userId: result.creator.id,
          pin,
        })
      }
      window.history.pushState({}, '', `${import.meta.env.BASE_URL}?event=${result.event.id}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (err) {
      reportError('HomePage', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-4 md:p-6">
      <h1 className="mb-2 text-3xl font-bold text-slate-100">{t('app.title')}</h1>
      <p className="mb-6 text-gray-600">{t('home.tagline')}</p>

      {!creating ? (
        <Button onClick={() => setCreating(true)} className="mb-6 w-full">
          + {t('home.newEvent')}
        </Button>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mb-6 space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <Input
            placeholder={t('home.eventName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            autoFocus
          />
          <Input
            placeholder={t('home.yourName')}
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
          />
          <Input
            placeholder={t('home.yourAlias')}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={50}
          />
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder={t('pin.createField')}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
          <p className="-mt-1 text-xs text-slate-500">{t('pin.createHint')}</p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCreating(false)
                  setError(null)
                }}
                disabled={busy}
              >
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" disabled={busy || !online}>
              {busy ? '…' : t('home.submit')}
            </Button>
          </div>
        </form>
      )}

      <RecentEventsList items={items} onForget={forget} />
    </main>
  )
}
