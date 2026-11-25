import { describe, it, expect } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { ParticipantsTab } from '@/presentation/components/features/event/ParticipantsTab'
import { makeEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const ANE = uid(2)
const NORA = uid(3)
const TOBY = uid(4)

const event = () =>
  makeEvent({
    createdBy: ME,
    users: [
      makeUser(ME, { name: 'Iker' }),
      makeUser(ANE, { name: 'Ane', alias: 'Anita' }),
      makeUser(NORA, { name: 'Nora', kind: 'child', guardianId: ANE }),
      makeUser(TOBY, { name: 'Toby', kind: 'dog' }),
    ],
  })

const openEditorFor = async (name: RegExp) => {
  fireEvent.click(await screen.findByRole('button', { name }))
  return screen.findByRole('dialog')
}

describe('ParticipantsTab', () => {
  it('lists everyone with their nickname, marks who you are and tags children and dogs', async () => {
    await renderWithEvent(<ParticipantsTab />, event(), ME)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(within(rows[0]!).getByText('You')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Ane (Anita)')).toBeInTheDocument()
    expect(within(rows[1]!).queryByText('You')).toBeNull()
    expect(within(rows[2]!).getByText('Child')).toBeInTheDocument()
    expect(within(rows[3]!).getByText('Dog')).toBeInTheDocument()
  })

  it('adds a child under a guardian, offering only adults as guardians', async () => {
    const app = await renderWithEvent(<ParticipantsTab />, event(), ME)
    fireEvent.click(screen.getByRole('button', { name: /add participant/i }))
    const dialog = await screen.findByRole('dialog')
    const add = within(dialog).getByRole('button', { name: /^add$/i })

    fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: ' M ' } })
    expect(add).toBeDisabled()
    fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: ' Mia ' } })
    expect(add).toBeEnabled()

    fireEvent.change(within(dialog).getByRole('combobox', { name: /type/i }), {
      target: { value: 'child' },
    })
    const guardian = within(dialog).getByRole('combobox', { name: /in the charge of/i })
    expect([...guardian.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      'Not assigned',
      'Iker',
      'Ane (Anita)',
    ])
    fireEvent.change(guardian, { target: { value: ANE } })
    fireEvent.click(add)

    await waitFor(async () => {
      const mia = (await app.saved()).users.find((u) => u.name === 'Mia')
      expect(mia).toMatchObject({ kind: 'child', guardianId: ANE, alias: null })
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('drops the guardian again when the kind is changed away from child', async () => {
    const app = await renderWithEvent(<ParticipantsTab />, event(), ME)
    fireEvent.click(screen.getByRole('button', { name: /add participant/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: 'Rex' } })
    const kind = within(dialog).getByRole('combobox', { name: /type/i })
    fireEvent.change(kind, { target: { value: 'child' } })
    fireEvent.change(within(dialog).getByRole('combobox', { name: /in the charge of/i }), {
      target: { value: ANE },
    })
    fireEvent.change(kind, { target: { value: 'dog' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /^add$/i }))

    await waitFor(async () =>
      expect((await app.saved()).users.find((u) => u.name === 'Rex')).toMatchObject({
        kind: 'dog',
        guardianId: null,
      }),
    )
  })

  it('keeps the form open and says what went wrong when the server rejects it', async () => {
    const app = await renderWithEvent(<ParticipantsTab />, event(), ME)
    fireEvent.click(screen.getByRole('button', { name: /add participant/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText('Name'), {
      target: { value: 'x'.repeat(51) },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^add$/i }))

    expect(await within(dialog).findByText('ZodError')).toBeInTheDocument()
    expect((await app.saved()).users).toHaveLength(4)
    expect(within(dialog).getByRole('button', { name: /^add$/i })).toBeEnabled()
  })

  it("saves an edited profile, and keeps this device's identity in step when it is yours", async () => {
    localStorage.clear()
    const app = await renderWithEvent(<ParticipantsTab />, event(), ME)
    const dialog = await openEditorFor(/Iker/)
    fireEvent.change(within(dialog).getByPlaceholderText('Nickname'), {
      target: { value: ' Ike ' },
    })
    fireEvent.change(within(dialog).getByPlaceholderText('Email'), { target: { value: 'i@k.er' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /add allergy/i }))
    fireEvent.change(within(dialog).getByRole('option', { name: 'Egg' }).closest('select')!, {
      target: { value: 'egg' },
    })
    fireEvent.click(
      within(dialog)
        .getAllByRole('button', { name: /add allergy/i })
        .at(-1)!,
    )
    fireEvent.click(within(dialog).getByRole('button', { name: /save profile/i }))

    await waitFor(async () => {
      const me = (await app.saved()).users.find((u) => u.id === ME)!
      expect(me).toMatchObject({ alias: 'Ike', email: 'i@k.er', phone: null, household: null })
      expect(me.allergies).toEqual([{ name: 'egg', severity: 'mild', notes: null }])
    })
    expect(new LocalStorageCache().getIdentity('abc123x')).toEqual({
      id: ME,
      name: 'Iker',
      alias: 'Ike',
    })
  })

  it('lets anyone but the creator be removed, after confirming', async () => {
    const app = await renderWithEvent(<ParticipantsTab />, event(), ME)
    const own = await openEditorFor(/Iker/)
    expect(within(own).queryByRole('button', { name: /remove from event/i })).toBeNull()
    fireEvent.click(within(own).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const dialog = await openEditorFor(/Ane/)
    fireEvent.click(within(dialog).getByRole('button', { name: /remove from event/i }))
    expect(within(dialog).getByText('Remove Ane (Anita) from this event?')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /yes, remove/i }))

    await waitFor(async () => expect((await app.saved()).users.map((u) => u.id)).not.toContain(ANE))
  })

  it('forgets who you are on this device when you say you are not this person', async () => {
    const cache = new LocalStorageCache()
    cache.setIdentity('abc123x', { id: ME, name: 'Iker', alias: null })
    await renderWithEvent(<ParticipantsTab />, event(), ME)
    const dialog = await openEditorFor(/Iker/)
    fireEvent.click(within(dialog).getByRole('button', { name: /i'm not this person/i }))
    fireEvent.click(within(dialog).getByRole('button', { name: /yes, change participant/i }))
    expect(cache.getIdentity('abc123x')).toBeNull()
  })
})
