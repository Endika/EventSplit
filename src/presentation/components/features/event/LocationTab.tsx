import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import type { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import type { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Button } from '@/presentation/components/common/Button'
import { reportError } from '@/shared/utils/reportError'
import { Input } from '@/presentation/components/common/Input'

export function LocationTab() {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const loc = event?.location ?? null

  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pinInput, setPinInput] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [confirmRemovePin, setConfirmRemovePin] = useState(false)
  const hasPin = !!event?.editPin

  const [eventName, setEventName] = useState(event?.name ?? '')
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

  function saveName() {
    if (!event || !me) return
    const trimmed = eventName.trim()
    if (trimmed.length < 3 || trimmed === event.name) {
      setEventName(event.name) // reset if invalid/unchanged
      return
    }
    guardedExecute(async () => {
      try {
        const handler = container.resolve<EditEventDetailsHandler>('editEventDetails')
        const result = await handler.execute({ eventId: event.id, name: trimmed })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('LocationTab', err)
      }
    })
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
        setEvent(result.event, result.version)
        setEditing(false)
      } catch (err) {
        reportError('LocationTab', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  function savePin(pin: string | null) {
    if (!event || !me) return
    guardedExecute(async () => {
      setPinBusy(true)
      setPinError(null)
      try {
        const handler = container.resolve<SetEditPinHandler>('setEditPin')
        const result = await handler.execute({ eventId: event.id, userId: me.id, pin })
        setEvent(result.event, result.version)
        // Setting a PIN from this device: mark this device verified so the user
        // who just set it isn't immediately locked out. Clearing: remove the flag.
        if (pin) {
          localStorage.setItem(`eventsplit.pin.${event.id}`, 'true')
        } else {
          localStorage.removeItem(`eventsplit.pin.${event.id}`)
        }
        setPinInput('')
        setConfirmRemovePin(false)
      } catch (err) {
        reportError('LocationTab', err)
        setPinError(err instanceof Error ? err.message : 'Error')
      } finally {
        setPinBusy(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-slate-300">
        {t('location.eventName')}
        <input
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          onBlur={saveName}
          minLength={3}
          maxLength={100}
        />
      </label>

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

      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          🔒 {t('pin.manageTitle')}
        </h2>
        {!hasPin ? (
          <>
            <p className="text-xs text-slate-500">{t('pin.noPinYet')}</p>
            <div className="flex gap-2">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('pin.field')}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="max-w-[10rem]"
              />
              <Button
                type="button"
                onClick={() => savePin(pinInput)}
                disabled={pinBusy || pinInput.length < 4 || pinInput.length > 6}
              >
                {t('pin.setPin')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-emerald-400">{t('pin.hasPin')}</p>
            <div className="flex gap-2">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('pin.changeField')}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="max-w-[10rem]"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => savePin(pinInput)}
                disabled={pinBusy || pinInput.length < 4 || pinInput.length > 6}
              >
                {t('pin.changePin')}
              </Button>
            </div>
            {!confirmRemovePin ? (
              <button
                type="button"
                onClick={() => setConfirmRemovePin(true)}
                className="text-xs text-rose-400 hover:text-rose-300"
                disabled={pinBusy}
              >
                {t('pin.removePin')}
              </button>
            ) : (
              <div className="space-y-2 rounded border border-rose-900/50 bg-rose-950/30 p-2">
                <p className="text-xs text-slate-300">{t('pin.removeConfirm')}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmRemovePin(false)}
                    disabled={pinBusy}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" onClick={() => savePin(null)} disabled={pinBusy}>
                    {t('pin.removeYes')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {hasPin && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(`eventsplit.pin.${event.id}`)
              window.location.reload()
            }}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {t('pin.lockDevice')}
          </button>
        )}
        {pinError && <p className="text-xs text-rose-400">{pinError}</p>}
        <p className="text-xs text-slate-600">{t('pin.manageHint')}</p>
        <p className="text-xs text-slate-600">{t('pin.ownerVerifiedHint')}</p>
      </div>
    </div>
  )
}
