import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import type { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function LocationTab() {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const loc = event?.location ?? null

  const { guardedExecute } = useWriteGuard()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(loc?.name ?? '')
  const [address, setAddress] = useState(loc?.address ?? '')
  const [lat, setLat] = useState(loc?.lat?.toString() ?? '')
  const [lng, setLng] = useState(loc?.lng?.toString() ?? '')
  const [postalCode, setPostalCode] = useState(loc?.postalCode ?? '')
  const [notes, setNotes] = useState(event?.generalNotes ?? '')
  const [wifi, setWifi] = useState(event?.wifiPassword ?? '')
  const [emergency, setEmergency] = useState(event?.emergencyContact ?? '')

  if (!event) return null

  function startEdit() {
    setName(event!.location?.name ?? '')
    setAddress(event!.location?.address ?? '')
    setLat(event!.location?.lat?.toString() ?? '')
    setLng(event!.location?.lng?.toString() ?? '')
    setPostalCode(event!.location?.postalCode ?? '')
    setNotes(event!.generalNotes ?? '')
    setWifi(event!.wifiPassword ?? '')
    setEmergency(event!.emergencyContact ?? '')
    setEditing(true)
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!event) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<EditEventDetailsHandler>('editEventDetails')
        const parsedLat = lat.trim() === '' ? null : parseFloat(lat)
        const parsedLng = lng.trim() === '' ? null : parseFloat(lng)
        const result = await handler.execute({
          eventId: event.id,
          location: name.trim()
            ? {
                name: name.trim(),
                address: address.trim() || null,
                lat: parsedLat !== null && Number.isFinite(parsedLat) ? parsedLat : null,
                lng: parsedLng !== null && Number.isFinite(parsedLng) ? parsedLng : null,
                postalCode: postalCode.trim() || null,
              }
            : null,
          generalNotes: notes.trim() || null,
          wifiPassword: wifi.trim() || null,
          emergencyContact: emergency.trim() || null,
        })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('location.title')}
        </h2>
        {!editing && (
          <Button variant="secondary" onClick={startEdit}>
            {t('location.edit')}
          </Button>
        )}
      </div>

      {!editing && (
        <>
          {!loc && !event.generalNotes && !event.wifiPassword && !event.emergencyContact ? (
            <p className="text-sm text-slate-400">{t('location.noLocation')}</p>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
              {loc && (
                <>
                  <div className="font-medium text-slate-100">{loc.name}</div>
                  {loc.address && <div className="text-sm text-slate-300">{loc.address}</div>}
                  {loc.postalCode && (
                    <div className="text-sm text-slate-400">{loc.postalCode}</div>
                  )}
                  {loc.googleMapsUrl && (
                    <a
                      href={loc.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-violet-300 underline hover:text-violet-200"
                    >
                      {t('location.openInMaps')} ↗
                    </a>
                  )}
                </>
              )}
              {event.generalNotes && (
                <div>
                  <div className="text-xs uppercase text-slate-500">{t('location.notes')}</div>
                  <div className="whitespace-pre-wrap text-sm text-slate-200">
                    {event.generalNotes}
                  </div>
                </div>
              )}
              {event.wifiPassword && (
                <div>
                  <div className="text-xs uppercase text-slate-500">{t('location.wifi')}</div>
                  <code className="text-sm text-slate-200">{event.wifiPassword}</code>
                </div>
              )}
              {event.emergencyContact && (
                <div>
                  <div className="text-xs uppercase text-slate-500">
                    {t('location.emergency')}
                  </div>
                  <div className="text-sm text-slate-200">{event.emergencyContact}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <form
          onSubmit={save}
          className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <Input
            placeholder={t('location.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <Input
            placeholder={t('location.address')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="any"
              placeholder={t('location.lat')}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <Input
              type="number"
              step="any"
              placeholder={t('location.lng')}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <Input
            placeholder={t('location.postalCode')}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={20}
          />
          <textarea
            placeholder={t('location.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <Input
            placeholder={t('location.wifi')}
            value={wifi}
            onChange={(e) => setWifi(e.target.value)}
            maxLength={50}
          />
          <Input
            placeholder={t('location.emergency')}
            value={emergency}
            onChange={(e) => setEmergency(e.target.value)}
            maxLength={100}
          />

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t('location.saving') : t('location.save')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
