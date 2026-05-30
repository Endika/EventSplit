import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser, useSetCurrentUser } from '@/presentation/context/UserContext'
import {
  COMMON_ALLERGENS,
  type AllergenName,
  type AllergenSeverity,
  type AllergenSnapshot,
} from '@/domain/value-objects/Allergen'
import type { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import type { RemoveParticipantHandler } from '@/application/handlers/RemoveParticipantHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { UserKind } from '@/domain/entities/User'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { reportError } from '@/shared/utils/reportError'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { ConsumptionSummary } from './ConsumptionSummary'

export function ProfileEditor({ userId, onClose }: { userId?: string; onClose: () => void }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()

  const targetUserId = userId ?? me?.id
  const myRow = event && targetUserId ? event.users.find((u) => u.id === targetUserId) : undefined

  const [name, setName] = useState(myRow?.name ?? '')
  const [alias, setAlias] = useState(myRow?.alias ?? '')
  const [email, setEmail] = useState(myRow?.email ?? '')
  const [phone, setPhone] = useState(myRow?.phone ?? '')
  const [dietary, setDietary] = useState(myRow?.dietary ?? '')
  const [notes, setNotes] = useState(myRow?.notes ?? '')
  const [allergies, setAllergies] = useState<AllergenSnapshot[]>(myRow?.allergies ?? [])
  const [kind, setKind] = useState<UserKind>(myRow?.kind ?? 'adult')

  const [newAllergen, setNewAllergen] = useState<AllergenName>('gluten')
  const [newSeverity, setNewSeverity] = useState<AllergenSeverity>('mild')
  const [newAllergyNote, setNewAllergyNote] = useState('')
  const [showAllergyPicker, setShowAllergyPicker] = useState(false)

  const { guardedExecute } = useWriteGuard()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSwitch, setConfirmSwitch] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  if (!event || !targetUserId) return null

  const isSelf = targetUserId === me?.id

  function addAllergy() {
    if (newAllergen !== 'other' && allergies.some((a) => a.name === newAllergen)) return
    setAllergies([
      ...allergies,
      { name: newAllergen, severity: newSeverity, notes: newAllergyNote.trim() || null },
    ])
    setNewAllergyNote('')
  }

  function removeAllergy(index: number) {
    setAllergies(allergies.filter((_, i) => i !== index))
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!event || !targetUserId || !me?.id) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<UpdateProfileHandler>('updateProfile')
        const result = await handler.execute({
          eventId: event.id,
          userId: targetUserId,
          actorId: me.id,
          name: name.trim(),
          alias: alias.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          dietary: dietary.trim() || null,
          notes: notes.trim() || null,
          kind,
          allergies,
        })
        setEvent(result.event, result.version)
        // Sync local identity only when editing self
        if (targetUserId === me?.id) {
          const updated = result.event.users.find((u) => u.id === me.id)
          if (updated) {
            setMe({
              id: updated.id,
              name: updated.name,
              alias: updated.alias,
              displayName: updated.alias ? `${updated.name} (${updated.alias})` : updated.name,
            })
            container.resolve<LocalStorageCache>('cache').setIdentity(event.id, {
              id: updated.id,
              name: updated.name,
              alias: updated.alias,
            })
          }
        }
        onClose()
      } catch (err) {
        reportError('ProfileEditor', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  function doRemove() {
    if (!event || !targetUserId) return
    guardedExecute(async () => {
      setBusy(true)
      setRemoveError(null)
      try {
        const handler = container.resolve<RemoveParticipantHandler>('removeParticipant')
        const result = await handler.execute({
          eventId: event.id,
          userId: targetUserId,
        })
        setEvent(result.event, result.version)
        // If removing self, also clear identity
        if (targetUserId === me?.id) {
          container.resolve<LocalStorageCache>('cache').removeIdentity(event.id)
          setMe(null)
        }
        onClose()
      } catch (err) {
        reportError('RemoveParticipant', err)
        setRemoveError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <Modal
      open
      title={isSelf ? t('profile.title') : t('participants.editTitle')}
      dismissable={!busy}
      onClose={onClose}
    >
      <form onSubmit={save} className="space-y-3">
        <Input
          placeholder={t('profile.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={50}
        />
        <Input
          placeholder={t('profile.alias')}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={50}
        />
        <label className="block text-sm text-muted">
          {t('participants.kind')}
          <select
            className="mt-1 block w-full rounded-xl border border-border bg-surface p-2 text-base text-ink sm:text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as UserKind)}
            disabled={busy}
          >
            <option value="adult">{t('participants.adult')}</option>
            <option value="child">{t('participants.child')}</option>
          </select>
        </label>
        <Input
          type="email"
          placeholder={t('profile.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={100}
        />
        <Input
          type="tel"
          inputMode="tel"
          placeholder={t('profile.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
        />
        <Input
          placeholder={t('profile.dietary')}
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          maxLength={200}
        />
        <textarea
          placeholder={t('profile.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
        />

        <div>
          <p className="mb-2 text-xs uppercase text-muted">{t('profile.allergies')}</p>
          {allergies.length === 0 && <p className="text-xs text-muted">—</p>}
          <ul className="space-y-1">
            {allergies.map((a, index) => (
              <li
                key={`${a.name}-${index}`}
                className="flex items-center justify-between rounded border border-border bg-elevated px-2 py-1 text-sm text-ink"
              >
                <span>
                  {t(`allergens.${a.name}`)}
                  {a.notes ? ` — ${a.notes}` : ''} — {t(`allergens.severity.${a.severity}`)}
                </span>
                <button
                  type="button"
                  className="text-xs text-danger hover:text-danger"
                  onClick={() => removeAllergy(index)}
                  disabled={busy}
                >
                  {t('profile.remove')}
                </button>
              </li>
            ))}
          </ul>
          {!showAllergyPicker ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              onClick={() => setShowAllergyPicker(true)}
              disabled={busy}
            >
              + {t('profile.addAllergy')}
            </Button>
          ) : (
            <div className="mt-2 space-y-2 rounded-xl border border-border bg-elevated/50 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded border border-border bg-surface px-2 py-1 text-base text-ink sm:text-sm"
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value as AllergenName)}
                  disabled={busy}
                >
                  {(() => {
                    const opts: AllergenName[] = [
                      ...COMMON_ALLERGENS.filter((n) => n !== 'other').sort((a, b) =>
                        t(`allergens.${a}`).localeCompare(t(`allergens.${b}`)),
                      ),
                      'other',
                    ]
                    return opts.map((name) => (
                      <option key={name} value={name}>
                        {t(`allergens.${name}`)}
                      </option>
                    ))
                  })()}
                </select>
                <select
                  className="rounded border border-border bg-surface px-2 py-1 text-base text-ink sm:text-sm"
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as AllergenSeverity)}
                  disabled={busy}
                >
                  <option value="mild">{t('allergens.severity.mild')}</option>
                  <option value="moderate">{t('allergens.severity.moderate')}</option>
                  <option value="severe">{t('allergens.severity.severe')}</option>
                </select>
                <input
                  className="rounded border border-border bg-surface px-2 py-1 text-base text-ink placeholder-muted sm:text-sm"
                  value={newAllergyNote}
                  onChange={(e) => setNewAllergyNote(e.target.value)}
                  maxLength={200}
                  placeholder={
                    newAllergen === 'other'
                      ? t('profile.allergyOtherPlaceholder')
                      : t('profile.allergyNotePlaceholder')
                  }
                  disabled={busy}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAllergyPicker(false)
                    setNewAllergyNote('')
                  }}
                  disabled={busy}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    addAllergy()
                    setShowAllergyPicker(false)
                  }}
                  disabled={busy}
                >
                  {t('profile.addAllergy')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <ConsumptionSummary userId={targetUserId} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="-mx-6 flex gap-2 border-t border-border bg-surface px-6 py-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={busy}>
            {busy ? t('profile.saving') : t('profile.save')}
          </Button>
        </div>

        {event.createdBy !== targetUserId && (
          <div className="mt-4 border-t border-border pt-3">
            {!confirmRemove ? (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="text-xs text-danger hover:text-danger"
                disabled={busy}
              >
                {t('participants.remove')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  {t('participants.removeConfirm', {
                    name: myRow?.alias ? `${myRow.name} (${myRow.alias})` : (myRow?.name ?? ''),
                  })}
                </p>
                <p className="text-xs text-danger">{t('participants.removeWarning')}</p>
                {removeError && <p className="text-xs text-danger break-all">{removeError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                  >
                    {t('participants.removeCancel')}
                  </Button>
                  <Button type="button" onClick={doRemove} loading={busy} disabled={busy}>
                    {t('participants.removeYes')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isSelf && (
          <div className="mt-4 border-t border-border pt-3">
            {!confirmSwitch ? (
              <button
                type="button"
                onClick={() => setConfirmSwitch(true)}
                className="text-xs text-muted hover:text-danger"
                disabled={busy}
              >
                {t('participants.switchUser')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted">{t('participants.switchConfirm')}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmSwitch(false)}
                    disabled={busy}
                  >
                    {t('participants.switchCancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      container.resolve<LocalStorageCache>('cache').removeIdentity(event!.id)
                      setMe(null)
                      onClose()
                    }}
                  >
                    {t('participants.switchYes')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
