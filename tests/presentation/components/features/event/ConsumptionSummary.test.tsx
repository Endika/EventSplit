import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { ConsumptionSummary } from '@/presentation/components/features/event/ConsumptionSummary'
import type { EventSnapshot } from '@/domain/entities/Event'
import { useEffect, type ReactNode } from 'react'

function Wrap({ event, children }: { event: EventSnapshot; children: ReactNode }) {
  return (
    <ContainerProvider>
      <EventProvider>
        <Init event={event} />
        {children}
      </EventProvider>
    </ContainerProvider>
  )
}
function Init({ event }: { event: EventSnapshot }) {
  const { setEvent } = useEventState()
  useEffect(() => {
    setEvent(event, 1)
  }, [event, setEvent])
  return null
}

function makeEvent(overrides: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'evt', name: 'Test', description: null, location: null,
    generalNotes: null, days: [], chosenDay: null, stage: 'planning',
    availability: {}, availabilityNote: null,
    users: [{ id: 'u1', name: 'Iker', alias: null, kind: 'adult',
      email: null, phone: null, dietary: null, notes: null, allergies: [],
      joinedAt: '2026-01-01T00:00:00.000Z' }],
    purchases: [], expenses: [], history: [], groupOrder: [], subgroupOrder: {},
    createdAt: '2026-01-01T00:00:00.000Z', schemaVersion: 1,
    ...overrides,
  } as EventSnapshot
}

describe('ConsumptionSummary', () => {
  it('renders the empty message for a user with no participation', async () => {
    const event = makeEvent({
      purchases: [{
        id: 'p1', createdBy: 'u1', kind: 'buy', item: 'Wine', quantity: 1,
        unit: 'bottles', dailyConsumption: 1, totalQuantity: 6,
        consumers: [{ userId: 'u2', multiplier: 1 }], deleted: false,
        deletedBy: null, deletedAt: null, deleteReason: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        assignedTo: null, purchased: false, boughtQuantity: 0,
        group: null, subgroup: null,
      }],
    })
    render(<Wrap event={event}><ConsumptionSummary userId="u1" /></Wrap>)
    expect(await screen.findByText(/disfruta del evento|enjoy the event|gaudeix|gaudix|ondo pasa|disfruta do evento/i)).toBeInTheDocument()
  })

  it('renders headline + detail + closing for a user with consumption', async () => {
    const event = makeEvent({
      purchases: [{
        id: 'p1', createdBy: 'u1', kind: 'buy', item: 'Wine', quantity: 1,
        unit: 'bottles', dailyConsumption: 1, totalQuantity: 6,
        consumers: [{ userId: 'u1', multiplier: 1 }], deleted: false,
        deletedBy: null, deletedAt: null, deleteReason: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        assignedTo: null, purchased: false, boughtQuantity: 0,
        group: null, subgroup: null,
      }],
    })
    render(<Wrap event={event}><ConsumptionSummary userId="u1" /></Wrap>)
    expect(await screen.findByText(/Wine/)).toBeInTheDocument()
    expect(screen.getByText(/recortar la lista|trim the list|retallar la llista|retallar a lista|murriztu/i)).toBeInTheDocument()
  })

  it('renders the brought block when the user only brings', async () => {
    const event = makeEvent({
      purchases: [{
        id: 'p1', createdBy: 'u1', kind: 'bring', item: 'Ice', quantity: 1,
        unit: 'kg', dailyConsumption: 0, totalQuantity: 1, consumers: [],
        deleted: false, deletedBy: null, deletedAt: null, deleteReason: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        assignedTo: 'u1', purchased: false, boughtQuantity: 0,
        group: null, subgroup: null,
      }],
    })
    render(<Wrap event={event}><ConsumptionSummary userId="u1" /></Wrap>)
    expect(await screen.findByText(/Ice/)).toBeInTheDocument()
    expect(screen.queryByText(/recortar la lista|trim the list/i)).toBeNull()
  })
})
