import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser, useSetCurrentUser } from '@/presentation/context/UserContext'
import { COMMON_ALLERGENS, type AllergenName, type AllergenSeverity, type AllergenSnapshot } from '@/domain/value-objects/Allergen'
import type { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { UserKind } from '@/domain/entities/User'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const setMe = useSetCurrentUser()

  const myRow = event && me ? event.users.find((u) => u.id === me.id) : undefined

  const [alias, setAlias] = useState(myRow?.alias ?? '')
  const [email, setEmail] = useState(myRow?.email ?? '')
  const [phone, setPhone] = useState(myRow?.phone ?? '')
  const [dietary, setDietary] = useState(myRow?.dietary ?? '')
  const [notes, setNotes] = useState(myRow?.notes ?? '')
  const [allergies, setAllergies] = useState<AllergenSnapshot[]>(myRow?.allergies ?? [])
  const [kind, setKind] = useState<UserKind>(myRow?.kind ?? 'adult')

  const [newAllergen, setNewAllergen] = useState<AllergenName>('gluten')
  const [newSeverity, setNewSeverity] = useState<AllergenSeverity>('mild')

  const { guardedExecute } = useWriteGuard()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!event || !me) return null

  function addAllergy() {
    if (allergies.some((a) => a.name === newAllergen)) return
    setAllergies([...allergies, { name: newAllergen, severity: newSeverity, notes: null }])
  }

  function removeAllergy(name: AllergenName) {
    setAllergies(allergies.filter((a) => a.name !== name))
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!event || !me) return
    guardedExecute(async () => {
      setBusy(true)
      setError(null)
      try {
        const handler = container.resolve<UpdateProfileHandler>('updateProfile')
        const result = await handler.execute({
          eventId: event.id,
          userId: me.id,
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
        // Sync local identity (alias may have changed)
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
        onClose()
      } catch (err) {
        console.error('[ProfileEditor]', err)
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <Modal open title={t('profile.title')} dismissable={!busy} onClose={onClose}>
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
            {allergies.map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
              >
                <span>
                  {t(`allergens.${a.name}`)} — {t(`allergens.severity.${a.severity}`)}
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-400 hover:text-rose-300"
                  onClick={() => removeAllergy(a.name)}
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
      </form>
    </Modal>
  )
}
