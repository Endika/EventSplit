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
import { renderWithEvent } from '../../../../support/renderWithEvent'
import * as fx from '../../../../support/eventFixtures'
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
  household: null,
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

describe('PurchaseForm', () => {
  const rawIker = fx.uid(1)
  const rawAne = fx.uid(2)
  const users = [
    fx.makeUser(rawIker, { name: 'Iker' }),
    fx.makeUser(rawAne, { name: 'Ane' }),
    fx.makeUser(fx.uid(3), { name: 'Rex', kind: 'dog' }),
  ]

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  const typeItem = (name: string) =>
    fireEvent.change(screen.getByRole('textbox', { name: /item name/i }), {
      target: { value: name },
    })
  const submitForm = () =>
    fireEvent.submit(screen.getByRole('textbox', { name: /item name/i }).closest('form')!)

  it('saves a new item for everyone but the dog, with the group trimmed', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <PurchaseForm onDone={onDone} />,
      fx.makeEvent({ users }),
      rawIker,
    )
    typeItem('Water')
    fireEvent.change(screen.getByRole('textbox', { name: /daily consumption/i }), {
      target: { value: '1,5' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /^group/i }), {
      target: { value: '  Drinks ' },
    })
    submitForm()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const [saved] = (await app.saved()).purchases
    expect(saved).toMatchObject({
      item: 'Water',
      kind: 'buy',
      dailyConsumption: 1.5,
      group: 'Drinks',
      subgroup: null,
      consumers: [
        { userId: rawIker, multiplier: 1 },
        { userId: rawAne, multiplier: 1 },
      ],
    })
  })

  it('refuses a shared staple without a valid quantity and saves nothing', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <PurchaseForm onDone={onDone} />,
      fx.makeEvent({ users }),
      rawIker,
    )
    typeItem('Salt')
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), {
      target: { value: 'single' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^quantity/i }), {
      target: { value: '0' },
    })
    submitForm()
    expect(await screen.findByText(/valid quantity/i)).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    expect((await app.saved()).purchases).toEqual([])
  })

  it('saves a shared staple with its fixed quantity', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <PurchaseForm onDone={onDone} />,
      fx.makeEvent({ users }),
      rawIker,
    )
    typeItem('Salt')
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), {
      target: { value: 'single' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^quantity/i }), {
      target: { value: '3' },
    })
    submitForm()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((await app.saved()).purchases[0]).toMatchObject({
      item: 'Salt',
      unit: 'single',
      quantity: 3,
    })
  })

  it('saves an item I bring from home with who brings it', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <PurchaseForm onDone={onDone} />,
      fx.makeEvent({ users }),
      rawIker,
    )
    fireEvent.click(screen.getByRole('button', { name: /i bring it/i }))
    typeItem('Speaker')
    fireEvent.change(screen.getByRole('combobox', { name: /brought by/i }), {
      target: { value: rawAne },
    })
    submitForm()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((await app.saved()).purchases[0]).toMatchObject({
      item: 'Speaker',
      kind: 'bring',
      assignedTo: rawAne,
    })
  })

  it('pre-fills an existing item and saves the edit', async () => {
    const existing = fx.makePurchase(fx.uid(11), {
      createdBy: rawIker,
      item: 'Coke',
      dailyConsumption: 2,
      totalQuantity: 4,
      consumers: [{ userId: rawAne, multiplier: 1 }],
    })
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <PurchaseForm purchase={existing} onDone={onDone} />,
      fx.makeEvent({ users, purchases: [existing] }),
      rawIker,
    )
    expect(screen.getByRole('textbox', { name: /item name/i })).toHaveValue('Coke')
    expect(screen.getByRole('textbox', { name: /daily consumption/i })).toHaveValue('2')
    fireEvent.change(screen.getByRole('textbox', { name: /item name/i }), {
      target: { value: 'Cola' },
    })
    submitForm()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((await app.saved()).purchases[0]).toMatchObject({
      item: 'Cola',
      dailyConsumption: 2,
      consumers: [{ userId: rawAne, multiplier: 1 }],
    })
  })
})
