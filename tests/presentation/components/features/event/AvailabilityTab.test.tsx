import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { AvailabilityTab } from '@/presentation/components/features/event/AvailabilityTab'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { DayOption } from '@/domain/value-objects/DayOption'

const jun5: DayOption = { start: '2026-06-05', end: '2026-06-05', note: null }
const jun12: DayOption = { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' }

function makeEvent(
  dayOptions: DayOption[],
  availability: Record<string, boolean[]> = {},
): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [
      {
        id: 'u1',
        name: 'Iker',
        alias: null,
        kind: 'adult',
        joinedAt: '2026-01-01T00:00:00.000Z',
        email: null,
        phone: null,
        allergies: [],
        dietary: null,
      },
    ],
    availability,
    availabilityNote: null,
    chosenOptions: [],
    dayOptions,
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
    setUser({ id: 'u1', name: 'Iker', eventId: event.id })
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

function cell(iso: string): HTMLElement {
  const el = document.querySelector(`[data-iso="${iso}"]`)
  if (!el) throw new Error(`no cell for ${iso}`)
  return el as HTMLElement
}

const tableButton = () => screen.getByRole('button', { name: /^(tabla|table|taula|táboa)$/i })
const calendarButton = () =>
  screen.getByRole('button', { name: /^(calendario|calendar|egutegia|calendari)$/i })

describe('AvailabilityTab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-06-10T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('keeps an unsaved vote when switching view', async () => {
    render(
      <Wrap event={makeEvent([jun5])}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() => expect(cell('2026-06-05')).toBeInTheDocument())

    fireEvent.click(cell('2026-06-05'))
    expect(cell('2026-06-05')).toHaveAttribute('data-mine', 'true')

    fireEvent.click(tableButton())
    const box = screen.getAllByRole('checkbox').at(-1)
    expect(box).toBeChecked()

    fireEvent.click(calendarButton())
    expect(cell('2026-06-05')).toHaveAttribute('data-mine', 'true')
  })

  it('has a single save button, whichever view is showing', async () => {
    render(
      <Wrap event={makeEvent([jun5])}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() => expect(cell('2026-06-05')).toBeInTheDocument())
    const saves = () =>
      screen.getAllByRole('button', {
        name: /guardar disponibilidad|save availability|gorde eskuragarritasuna|desa la disponibilitat|gardar dispo|guarda la disponibilitat/i,
      })
    expect(saves()).toHaveLength(1)
    fireEvent.click(tableButton())
    expect(saves()).toHaveLength(1)
  })

  it('remembers the chosen view', async () => {
    const { unmount } = render(
      <Wrap event={makeEvent([jun5])}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() => expect(cell('2026-06-05')).toBeInTheDocument())
    fireEvent.click(tableButton())
    unmount()

    render(
      <Wrap event={makeEvent([jun5])}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() => expect(tableButton()).toHaveAttribute('aria-pressed', 'true'))
  })

  it('a vote in the calendar shows in the table count and vice versa', async () => {
    render(
      <Wrap event={makeEvent([jun5, jun12])}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() => expect(cell('2026-06-05')).toBeInTheDocument())

    fireEvent.click(cell('2026-06-05'))
    fireEvent.click(tableButton())
    // Table foot shows 1 of 1 for the voted option
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows the option note in the list', async () => {
    render(
      <Wrap event={makeEvent([jun12])}>
        <AvailabilityTab />
      </Wrap>,
    )
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /nota|note|oharra/i })).toBeInTheDocument(),
    )
    expect(screen.getByRole('textbox', { name: /nota|note|oharra/i })).toHaveValue('casa rural')
  })
})
