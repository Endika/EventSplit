import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser, useSetCurrentUser } from '@/presentation/context/UserContext'
import { COMMON_ALLERGENS, type AllergenName, type AllergenSeverity, type AllergenSnapshot } from '@/domain/value-objects/Allergen'
import type { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import type { RemoveParticipantHandler } from '@/application/handlers/RemoveParticipantHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { UserKind } from '@/domain/entities/User'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { reportError } from '@/shared/utils/reportError'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function ProfileEditor({
  userId,
  onClose,
}: {
  userId?: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()

  const targetUserId = userId ?? me?.id
  const myRow = event && targetUserId ? event.users.find((u) => u.id === targetUserId) : undefined

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
    setAllergies([...allergies, { name: newAllergen, severity: newSeverity, notes: newAllergyNote.trim() || null }])
    setNewAllergyNote('')
  }

  function removeAllergy(index: number) {
    setAllergies(allergies.filter((_, i) => i !== index))
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!event || !targetUserId) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<UpdateProfileHandler>('updateProfile')
        const result = await handler.execute({
          eventId: event.id,
          userId: targetUserId,
          alias: alias.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          dietary: dietary.trim() || null,
          notes: notes.trim() || null,
          kind,
          allergies,
        })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
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
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
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
    <Modal open title={isSelf ? t('profile.title') : t('participants.editTitle')} dismissable={!busy} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Input
          placeholder={t('profile.alias')}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={50}
        />
        <label className="block text-sm text-slate-300">
          {t('participants.kind')}
          <select
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
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
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />

        <div>
          <p className="mb-2 text-xs uppercase text-slate-500">{t('profile.allergies')}</p>
          {allergies.length === 0 && (
            <p className="text-xs text-slate-500">—</p>
          )}
          <ul className="space-y-1">
            {allergies.map((a, index) => (
              <li
                key={`${a.name}-${index}`}
                className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
              >
                <span>
                  {t(`allergens.${a.name}`)}
                  {a.notes ? ` — ${a.notes}` : ''}
                  {' '}— {t(`allergens.severity.${a.severity}`)}
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-400 hover:text-rose-300"
                  onClick={() => removeAllergy(index)}
                  disabled={busy}
                >
                  {t('profile.remove')}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={newAllergen}
              onChange={(e) => setNewAllergen(e.target.value as AllergenName)}
              disabled={busy}
            >
              {COMMON_ALLERGENS.map((name) => (
                <option key={name} value={name}>
                  {t(`allergens.${name}`)}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as AllergenSeverity)}
              disabled={busy}
            >
              <option value="mild">{t('allergens.severity.mild')}</option>
              <option value="moderate">{t('allergens.severity.moderate')}</option>
              <option value="severe">{t('allergens.severity.severe')}</option>
            </select>
            <input
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-500"
              value={newAllergyNote}
              onChange={(e) => setNewAllergyNote(e.target.value)}
              maxLength={200}
              placeholder={newAllergen === 'other' ? t('profile.allergyOtherPlaceholder') : t('profile.allergyNotePlaceholder')}
              disabled={busy}
            />
            <Button type="button" variant="secondary" onClick={addAllergy} disabled={busy}>
              + {t('profile.addAllergy')}
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t('profile.saving') : t('profile.save')}
          </Button>
        </div>

        {event.createdBy !== targetUserId && (
          <div className="mt-4 border-t border-slate-800 pt-3">
            {!confirmRemove ? (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="text-xs text-rose-400 hover:text-rose-300"
                disabled={busy}
              >
                {t('participants.remove')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  {t('participants.removeConfirm', { name: myRow?.alias ? `${myRow.name} (${myRow.alias})` : myRow?.name ?? '' })}
                </p>
                <p className="text-xs text-rose-400">{t('participants.removeWarning')}</p>
                {removeError && <p className="text-xs text-rose-400 break-all">{removeError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setConfirmRemove(false)} disabled={busy}>
                    {t('participants.removeCancel')}
                  </Button>
                  <Button type="button" onClick={doRemove} disabled={busy}>
                    {t('participants.removeYes')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isSelf && (
          <div className="mt-4 border-t border-slate-800 pt-3">
            {!confirmSwitch ? (
              <button
                type="button"
                onClick={() => setConfirmSwitch(true)}
                className="text-xs text-slate-400 hover:text-rose-400"
                disabled={busy}
              >
                {t('participants.switchUser')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">{t('participants.switchConfirm')}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setConfirmSwitch(false)} disabled={busy}>
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
