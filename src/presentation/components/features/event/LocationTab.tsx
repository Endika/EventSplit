import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import type { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import type { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import type { DeleteEventHandler } from '@/application/handlers/DeleteEventHandler'
import type { RefreshEventHandler } from '@/application/handlers/RefreshEventHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { useEditPin } from '@/presentation/context/EditPinContext'
import { Button } from '@/presentation/components/common/Button'
import { reportError } from '@/shared/utils/reportError'
import { friendlyError } from '@/presentation/utils/friendlyError'
import { Input } from '@/presentation/components/common/Input'
import { AddressAutocomplete } from './AddressAutocomplete'
import { MapEmbed } from './MapEmbed'

export function LocationTab() {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const loc = event?.location ?? null

  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()
  const { pin: unlockedPin, setPin: setUnlockedPin } = useEditPin()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pinInput, setPinInput] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [confirmRemovePin, setConfirmRemovePin] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const hasPin = !!event?.hasPin

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
        setError(friendlyError(err, t))
      } finally {
        setBusy(false)
      }
    })
  }

  async function refreshFromServer() {
    if (!event) return
    const cache = container.resolve<LocalStorageCache>('cache')
    const refresh = container.resolve<RefreshEventHandler>('refreshEvent')
    // Force a full re-read so the derived hasPin flag reflects the change.
    const result = await refresh.execute({ eventId: event.id, local: null })
    if (result.status === 'updated' || result.status === 'unchanged') {
      setEvent(result.snapshot, result.version)
      cache.set(event.id, { snapshot: result.snapshot, version: result.version })
    }
  }

  function savePin(pin: string | null) {
    if (!event || !me) return
    guardedExecute(async () => {
      setPinBusy(true)
      setPinError(null)
      try {
        const handler = container.resolve<SetEditPinHandler>('setEditPin')
        // Changing or removing an existing PIN requires the current (unlocked) one.
        const currentPin = hasPin ? unlockedPin : null
        await handler.execute({ eventId: event.id, userId: me.id, pin, currentPin })
        // Keep the new PIN unlocked for this session so the host who just set it
        // isn't immediately locked out (and can pass it to later privileged ops).
        setUnlockedPin(pin)
        await refreshFromServer()
        setPinInput('')
        setConfirmRemovePin(false)
      } catch (err) {
        reportError('LocationTab', err)
        setPinError(friendlyError(err, t))
      } finally {
        setPinBusy(false)
      }
    })
  }

  function deleteEvent() {
    if (!event) return
    guardedExecute(async () => {
      setDeleteBusy(true)
      setDeleteError(null)
      try {
        const handler = container.resolve<DeleteEventHandler>('deleteEvent')
        await handler.execute(event.id, hasPin ? unlockedPin : null)
        // Wipe every local trace of this event, then go home.
        const cache = container.resolve<LocalStorageCache>('cache')
        cache.remove(event.id)
        setUnlockedPin(null)
        window.location.assign(window.location.pathname)
      } catch (err) {
        reportError('LocationTab', err)
        setDeleteError(friendlyError(err, t))
        setDeleteBusy(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-ink">
        {t('location.eventName')}
        <input
          className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          onBlur={saveName}
          minLength={3}
          maxLength={100}
        />
      </label>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
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
            <p className="text-sm text-muted">{t('location.noLocation')}</p>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
              {loc && (
                <>
                  <div className="font-medium text-ink">{loc.name}</div>
                  {loc.address && <div className="text-sm text-ink">{loc.address}</div>}
                  {loc.postalCode && <div className="text-sm text-muted">{loc.postalCode}</div>}
                  {loc.googleMapsUrl && (
                    <a
                      href={loc.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-brand underline hover:text-brand-hover"
                    >
                      {t('location.openInMaps')} ↗
                    </a>
                  )}
                  <MapEmbed address={loc.address} lat={loc.lat} lng={loc.lng} />
                </>
              )}
              {event.generalNotes && (
                <div>
                  <div className="text-xs uppercase text-muted">{t('location.notes')}</div>
                  <div className="whitespace-pre-wrap text-sm text-ink">{event.generalNotes}</div>
                </div>
              )}
              {event.wifiPassword && (
                <div>
                  <div className="text-xs uppercase text-muted">{t('location.wifi')}</div>
                  <code className="text-sm text-ink">{event.wifiPassword}</code>
                </div>
              )}
              {event.emergencyContact && (
                <div>
                  <div className="text-xs uppercase text-muted">{t('location.emergency')}</div>
                  <div className="text-sm text-ink">{event.emergencyContact}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <Input
            placeholder={t('location.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <AddressAutocomplete
            value={address}
            placeholder={t('location.address')}
            onChange={({ address: a, lat: la, lng: ln, name: placeName }) => {
              setAddress(a)
              setLat(la != null ? String(la) : '')
              setLng(ln != null ? String(ln) : '')
              if (placeName && !name.trim()) setName(placeName)
            }}
          />
          <p className="text-xs text-muted">{t('location.searchHint')}</p>
          {(address.trim() || (lat.trim() && lng.trim())) && (
            <MapEmbed
              address={address.trim() || null}
              lat={lat.trim() ? Number(lat) : null}
              lng={lng.trim() ? Number(lng) : null}
            />
          )}
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
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
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

          {error && <p className="text-sm text-danger">{error}</p>}

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

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          🔒 {t('pin.manageTitle')}
        </h2>
        {!hasPin ? (
          <>
            <p className="text-xs text-muted">{t('pin.noPinYet')}</p>
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
            <p className="text-xs text-pos">{t('pin.hasPin')}</p>
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
                className="text-xs text-danger hover:text-danger"
                disabled={pinBusy}
              >
                {t('pin.removePin')}
              </button>
            ) : (
              <div className="space-y-2 rounded border border-danger bg-danger-soft p-2">
                <p className="text-xs text-danger-soft-fg">{t('pin.removeConfirm')}</p>
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
              // Re-lock for this session: drop the unlocked PIN; the gate returns.
              setUnlockedPin(null)
            }}
            className="text-xs text-muted hover:text-ink"
          >
            {t('pin.lockDevice')}
          </button>
        )}
        {pinError && <p className="text-xs text-danger">{pinError}</p>}
        <p className="text-xs text-muted">{t('pin.manageHint')}</p>
        <p className="text-xs text-muted">{t('pin.ownerVerifiedHint')}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-danger bg-danger-soft p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-danger-soft-fg">
          {t('danger.title')}
        </h2>
        <p className="text-xs text-danger-soft-fg">{t('danger.deleteHint')}</p>
        {!confirmDelete ? (
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
            {t('danger.deleteEvent')}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-danger-soft-fg">{t('danger.deleteConfirm')}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteBusy}
              >
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={deleteEvent} disabled={deleteBusy}>
                {deleteBusy ? t('danger.deleting') : t('danger.deleteYes')}
              </Button>
            </div>
          </div>
        )}
        {deleteError && <p className="text-xs text-danger">{deleteError}</p>}
      </div>
    </div>
  )
}
