import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/presentation/i18n/config'
import { ShareListModal } from '@/presentation/components/features/event/ShareListModal'
import type { EventSnapshot } from '@/domain/entities/Event'

function makeEvent(): EventSnapshot {
  return {
    id: 'evt',
    name: 'Iker BDay',
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    dayOptions: [],
    chosenOptions: [],
    stage: 'doodle',
    hasPin: false,
    availability: {},
    availabilityNote: null,
    users: [
      {
        id: 'u1',
        name: 'Iker',
        alias: null,
        kind: 'adult',
        email: null,
        phone: null,
        dietary: null,
        notes: null,
        allergies: [],
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    purchases: [
      {
        id: 'p1',
        createdBy: 'u1',
        kind: 'buy',
        item: 'Wine',
        quantity: 1,
        unit: 'bottles',
        dailyConsumption: 1,
        totalQuantity: 10,
        consumers: [{ userId: 'u1', multiplier: 1 }],
        deleted: false,
        deletedBy: null,
        deletedAt: null,
        deleteReason: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        assignedTo: 'u1',
        purchased: false,
        boughtQuantity: 0,
        group: 'Drinks',
        subgroup: null,
      },
    ],
    expenses: [],
    history: [],
    groupOrder: [],
    subgroupOrder: {},
    settledTransfers: [],
    manualLiquidations: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('ShareListModal', () => {
  let writeText: ReturnType<typeof vi.fn>
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      value: undefined,
    })
  })

  it('renders the formatted preview text inside the modal', () => {
    render(<ShareListModal open event={makeEvent()} onClose={() => {}} />)
    expect(screen.getByText(/Wine/)).toBeInTheDocument()
    expect(screen.getByText(/📌 Drinks/)).toBeInTheDocument()
  })

  it('calls navigator.clipboard.writeText with the full text when Copy is clicked', async () => {
    render(<ShareListModal open event={makeEvent()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Copy|Copiar|Kopiatu/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0]![0]).toContain('Wine')
  })

  it('does not render the Share button when navigator.share is missing', () => {
    render(<ShareListModal open event={makeEvent()} onClose={() => {}} />)
    expect(
      screen.queryByRole('button', {
        name: /^Share$|^Share\.\.\.$|^Compartir$|^Compartir\.\.\.$|^Partekatu/i,
      }),
    ).toBeNull()
  })

  it('renders the Share button when navigator.share is available', () => {
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
    render(<ShareListModal open event={makeEvent()} onClose={() => {}} />)
    expect(
      screen.getByRole('button', { name: /Share\.\.\.|Compartir\.\.\.|Partekatu/i }),
    ).toBeInTheDocument()
  })

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn()
    render(<ShareListModal open event={makeEvent()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Close|Cerrar|Itxi|Tancar|Pechar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
