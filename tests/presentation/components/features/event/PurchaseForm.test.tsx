import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import '@/presentation/i18n/config'
import { ContainerProvider } from '@/presentation/context/ContainerProvider'
import { EventProvider, useEventState } from '@/presentation/context/EventContext'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import { WriteGuardProvider } from '@/presentation/context/WriteGuardContext'
import { EditPinProvider } from '@/presentation/context/EditPinContext'
import { SyncProvider } from '@/presentation/context/SyncContext'
import { PurchaseForm } from '@/presentation/components/features/event/PurchaseForm'
import { buildContainer } from '@/shared/di/wiring'
import { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import type { ReadResult } from '@/domain/repositories/IEventRepository'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { UserSnapshot } from '@/domain/entities/User'

const IKER = '00000000-0000-7000-8000-000000000001'
const ANE = '00000000-0000-7000-8000-000000000002'
const PURCHASE_ID = '00000000-0000-7000-8000-00000000000a'

const adult = (id: string, name: string): UserSnapshot => ({
  id,
  name,
  guardianId: null,
  alias: null,
  kind: 'adult',
  joinedAt: '2026-01-01T00:00:00.000Z',
  email: null,
  phone: null,
  allergies: [],
  dietary: null,
  notes: null,
})

const purchase = (assignedTo: string | null): PurchaseSnapshot => ({
  id: PURCHASE_ID,
  createdBy: IKER,
  kind: 'buy',
  item: 'Coke',
  quantity: 2,
  unit: 'bottles',
  dailyConsumption: 1,
  totalQuantity: 2,
  consumers: [{ userId: IKER, multiplier: 1 }],
  deleted: false,
  deletedBy: null,
  deletedAt: null,
  deleteReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  assignedTo,
  purchased: false,
  boughtQuantity: 0,
  group: null,
  subgroup: null,
})

const makeEvent = (p: PurchaseSnapshot): EventSnapshot => ({
  id: 'abc123x',
  name: 'Trip',
  createdBy: IKER,
  description: null,
  location: null,
  generalNotes: null,
  wifiPassword: null,
  emergencyContact: null,
  users: [adult(IKER, 'Iker'), adult(ANE, 'Ane')],
  availability: {},
  availabilityNote: null,
  chosenOptions: [],
  dayOptions: [{ start: '2026-06-05', end: '2026-06-06', note: null }],
  purchases: [p],
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
})

function Init({ event }: { event: EventSnapshot }) {
  const { setEvent } = useEventState()
  const setUser = useSetCurrentUser()
  useEffect(() => {
    setEvent(event, 1)
    setUser({ id: IKER, name: 'Iker', alias: null, displayName: 'Iker' })
  }, [event, setEvent, setUser])
  return null
}

function WhenLoaded({ children }: { children: ReactNode }) {
  const { event } = useEventState()
  return event ? <>{children}</> : null
}

async function saveWithBuyer(initial: string | null, picked: string) {
  const p = purchase(initial)
  const event = makeEvent(p)
  const repo = new InMemoryEventRepository()
  await repo.create(event)
  const container = buildContainer()
  container.register('editPurchase', () => new EditPurchaseHandler(repo))
  const onDone = vi.fn()
  render(
    <ContainerProvider container={container}>
      <EventProvider>
        <UserProvider>
          <EditPinProvider>
            <SyncProvider>
              <WriteGuardProvider>
                <Init event={event} />
                <WhenLoaded>
                  <PurchaseForm purchase={p} onDone={onDone} />
                </WhenLoaded>
              </WriteGuardProvider>
            </SyncProvider>
          </EditPinProvider>
        </UserProvider>
      </EventProvider>
    </ContainerProvider>,
  )
  const select = await screen.findByRole('combobox', { name: /who will buy it/i })
  fireEvent.change(select, { target: { value: picked } })
  fireEvent.submit(select.closest('form')!)
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  const saved = (await repo.findById(event.id)) as ReadResult
  return saved.snapshot.purchases[0]!.assignedTo
}

describe('PurchaseForm editing the buyer', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('saves the buyer picked in the form', async () => {
    expect(await saveWithBuyer(null, ANE)).toBe(ANE)
  })

  it('saves clearing the buyer back to nobody', async () => {
    expect(await saveWithBuyer(ANE, '')).toBeNull()
  })
})
