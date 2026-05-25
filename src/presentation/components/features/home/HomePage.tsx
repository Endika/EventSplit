import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import type { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { useOnlineStatus } from '@/presentation/context/SyncContext'

export function HomePage() {
  const { t } = useTranslation()
  const container = useContainer()
  const online = useOnlineStatus()
  const [name, setName] = useState('')
  const [yourName, setYourName] = useState('')
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const cache = container.resolve<LocalStorageCache>('cache')
      cache.set(result.event.id, { snapshot: result.event, version: result.version })
      cache.setIdentity(result.event.id, {
        id: result.creator.id,
        name: yourName.trim(),
        alias: alias.trim() || null,
      })
      window.history.pushState({}, '', `${import.meta.env.BASE_URL}?event=${result.event.id}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-3xl font-bold">{t('app.title')}</h1>
      <p className="mb-6 text-gray-600">{t('home.tagline')}</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          placeholder={t('home.eventName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={100}
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy || !online}>
          {busy ? '…' : t('home.submit')}
        </Button>
      </form>
    </main>
  )
}
