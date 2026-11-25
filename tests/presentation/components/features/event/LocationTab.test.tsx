import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { LocationTab } from '@/presentation/components/features/event/LocationTab'
import type { EventSnapshot, EventLocation } from '@/domain/entities/Event'
import { makeEvent as makeSavedEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

function makeEvent(location: EventLocation | null): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'u1',
    description: null,
    location,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [
      {
        id: 'u1',
        name: 'Iker',
        alias: null,
        kind: 'adult',
        guardianId: null,
        household: null,
        joinedAt: '2026-01-01T00:00:00.000Z',
        email: null,
        phone: null,
        allergies: [],
        dietary: null,
        notes: null,
      },
    ],
    availability: {},
    availabilityNote: null,
    chosenOptions: [],
    dayOptions: [],
    purchases: [],
    groupOrder: [],
    subgroupOrder: {},
    expenses: [],
    hasPin: false,
    stage: 'doodle',
    settledTransfers: [],
    manualLiquidations: [],
    history: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function Init({ event }: { event: EventSnapshot }) {
  const { setEvent } = useEventState()
  const setUser = useSetCurrentUser()
  useEffect(() => {
    setEvent(event, 1)
    setUser({ id: 'u1', name: 'Iker', alias: null, displayName: 'Iker' })
  }, [event, setEvent, setUser])
  return null
}

function Wrap({ event, children }: { event: EventSnapshot; children: ReactNode }) {
  return (
    <ContainerProvider>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>
            <WriteGuardProvider>
              <Init event={event} />
              {children}
            </WriteGuardProvider>
          </EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>
  )
}

const editButton = () => screen.getByRole('button', { name: /^(editar|edit|editatu|edita)$/i })

const saveButton = () =>
  screen.getByRole('button', {
    name: /^(guardar|save|gorde|desa|garda)$/i,
  })

describe('LocationTab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('does not wipe a saved location when the name is cleared', async () => {
    render(
      <Wrap
        event={makeEvent({
          name: 'Casa rural',
          address: 'Calle Mayor 1',
          lat: null,
          lng: null,
          postalCode: null,
          googleMapsUrl: null,
        })}
      >
        <LocationTab />
      </Wrap>,
    )
    fireEvent.click(await waitFor(() => editButton()))
    const nameInput = screen.getByDisplayValue('Casa rural')
    fireEvent.change(nameInput, { target: { value: '   ' } })
    fireEvent.click(saveButton())

    expect(
      await screen.findByText(
        /no se ha perdido|nothing you typed|ez da galdu|no s'ha perdut|non se perdeu/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Calle Mayor 1')).toBeInTheDocument()
  })

  it('keeps the other fields too, not just the address', async () => {
    render(
      <Wrap event={makeEvent(null)}>
        <LocationTab />
      </Wrap>,
    )
    fireEvent.click(await waitFor(() => editButton()))

    fireEvent.change(screen.getByPlaceholderText(/direcci(ó|o)n|address|helbide|adreça/i), {
      target: { value: 'Calle Mayor 1' },
    })
    fireEvent.change(
      screen.getByPlaceholderText(
        /notas generales|general notes|ohar|notes generals|notas xerais/i,
      ),
      {
        target: { value: 'llevar sacos' },
      },
    )
    fireEvent.change(screen.getByPlaceholderText(/wifi/i), {
      target: { value: 'hunter2' },
    })
    fireEvent.change(screen.getByPlaceholderText(/emergencia|emergency|larrialdi|emergència/i), {
      target: { value: '600123456' },
    })

    fireEvent.click(saveButton())

    expect(
      await screen.findByText(
        /no se ha perdido|nothing you typed|ez da galdu|no s'ha perdut|non se perdeu/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Calle Mayor 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('llevar sacos')).toBeInTheDocument()
    expect(screen.getByDisplayValue('hunter2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('600123456')).toBeInTheDocument()
  })

  it('puts the cursor on the name field so it is one tap to fix', async () => {
    render(
      <Wrap event={makeEvent(null)}>
        <LocationTab />
      </Wrap>,
    )
    fireEvent.click(await waitFor(() => editButton()))
    fireEvent.change(screen.getByPlaceholderText(/direcci(ó|o)n|address|helbide|adreça/i), {
      target: { value: 'Calle Mayor 1' },
    })
    fireEvent.click(saveButton())

    await screen.findByText(
      /no se ha perdido|nothing you typed|ez da galdu|no s'ha perdut|non se perdeu/i,
    )
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText(/nombre del sitio|place name|lekuaren|nom del/i),
    )
  })

  describe('on a saved event', () => {
    afterEach(() => vi.unstubAllGlobals())

    const ME = uid(1)
    const event = () => makeSavedEvent({ name: 'Trip', users: [makeUser(ME), makeUser(uid(2))] })
    const nameField = () => screen.getByLabelText(/event name|nombre del evento/i)

    it('renames the event on blur, trimmed, and puts back a name that is too short', async () => {
      const app = await renderWithEvent(<LocationTab />, event(), ME)
      fireEvent.change(nameField(), { target: { value: '  Summer trip  ' } })
      fireEvent.blur(nameField())
      await waitFor(async () => expect((await app.saved()).name).toBe('Summer trip'))

      fireEvent.change(nameField(), { target: { value: 'ab' } })
      fireEvent.blur(nameField())
      expect(nameField()).toHaveValue('Summer trip')
      expect((await app.saved()).name).toBe('Summer trip')
    })

    it('sets, then removes, the edit PIN, taking digits only and 4 to 6 of them', async () => {
      await renderWithEvent(<LocationTab />, event(), ME)
      const field = () => screen.getByPlaceholderText(/new pin/i)
      const setPin = screen.getByRole('button', { name: 'Set PIN' })
      fireEvent.change(field(), { target: { value: '12a3' } })
      expect(field()).toHaveValue('123')
      expect(setPin).toBeDisabled()

      fireEvent.change(field(), { target: { value: '1234' } })
      fireEvent.click(setPin)
      expect(await screen.findByText(/PIN active/)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Remove PIN' }))
      fireEvent.click(screen.getByRole('button', { name: 'Remove PIN' }))
      expect(await screen.findByText(/No PIN/)).toBeInTheDocument()
    })

    it('deletes the event for good only after a confirmation, then goes home', async () => {
      const assign = vi.fn()
      vi.stubGlobal('location', { ...window.location, pathname: '/app/', assign })
      const app = await renderWithEvent(<LocationTab />, event(), ME)
      fireEvent.click(screen.getByRole('button', { name: 'Delete event' }))
      expect(assign).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
      await waitFor(() => expect(assign).toHaveBeenCalledWith('/app/'))
      await expect(app.saved()).rejects.toThrow()
    })
  })
})
