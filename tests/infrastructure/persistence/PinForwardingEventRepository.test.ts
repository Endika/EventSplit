import { describe, it, expect, beforeEach } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { PinForwardingEventRepository } from '@/infrastructure/persistence/PinForwardingEventRepository'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'
import { isLockedEvent, WrongPinError } from '@/domain/repositories/IEventRepository'

/**
 * Regression guard for the hardening bug: collaborative write handlers go
 * through `withOptimisticRetry → repo.update(..., null)` with no PIN, so on a
 * PIN-protected event the server-side check rejects every normal edit. The
 * PinForwardingEventRepository decorator injects the session-unlocked PIN held
 * in the UnlockedPinHolder when the caller passed null.
 *
 * Without the decorator (handler over the bare InMemory repo) the success case
 * below fails with WrongPinError — that is the regression these tests pin down.
 */
describe('PinForwardingEventRepository (PIN-gated reads)', () => {
  beforeEach(() => localStorage.clear())

  async function pinned(inner: InMemoryEventRepository, pin: string) {
    const create = await new CreateEventHandler(inner).execute({
      name: 'Trip',
      creatorName: 'John',
    })
    await new SetEditPinHandler(inner).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin,
    })
    return create.event.id
  }

  it('reads through with the PIN remembered for that event', async () => {
    const inner = new InMemoryEventRepository()
    const id = await pinned(inner, '1234')
    const holder = new UnlockedPinHolder()
    holder.set(id, '1234')

    const read = await new PinForwardingEventRepository(inner, holder).findById(id)
    expect(isLockedEvent(read)).toBe(false)
  })

  it('still knows the PIN after a reload (a brand-new holder)', async () => {
    const inner = new InMemoryEventRepository()
    const id = await pinned(inner, '1234')
    new UnlockedPinHolder().set(id, '1234')

    const read = await new PinForwardingEventRepository(inner, new UnlockedPinHolder()).findById(id)
    expect(isLockedEvent(read)).toBe(false)
  })

  it('never lends one event its PIN for another', async () => {
    const inner = new InMemoryEventRepository()
    const first = await pinned(inner, '1234')
    const second = await pinned(inner, '1234')
    const holder = new UnlockedPinHolder()
    holder.set(first, '1234')

    const read = await new PinForwardingEventRepository(inner, holder).findById(second)
    expect(isLockedEvent(read)).toBe(true)
  })

  it('reads locked once the PIN is forgotten', async () => {
    const inner = new InMemoryEventRepository()
    const id = await pinned(inner, '1234')
    const holder = new UnlockedPinHolder()
    holder.set(id, '1234')
    holder.set(id, null)

    const read = await new PinForwardingEventRepository(inner, holder).findById(id)
    expect(isLockedEvent(read)).toBe(true)
  })
})

describe('PinForwardingEventRepository (collaborative write on a PIN-protected event)', () => {
  async function setup() {
    const inner = new InMemoryEventRepository()
    // Set the PIN directly on the inner repo (the decorator forwards currentPin
    // null → holder, but here there is no current PIN to change yet).
    const create = await new CreateEventHandler(inner).execute({
      name: 'Trip',
      creatorName: 'John',
    })
    await new SetEditPinHandler(inner).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      pin: '1234',
    })
    return { inner, eventId: create.event.id, payerId: create.creator.id }
  }

  it('SUCCEEDS when the holder carries the correct unlocked PIN', async () => {
    const { inner, eventId, payerId } = await setup()
    const holder = new UnlockedPinHolder()
    holder.set(eventId, '1234')
    const repo = new PinForwardingEventRepository(inner, holder)

    const result = await new AddExpenseHandler(repo).execute({
      eventId,
      paidBy: payerId,
      amountEuros: 12.34,
      description: 'Bread and milk',
    })

    expect(result.event.expenses).toHaveLength(1)
    expect(result.event.expenses[0]!.cents).toBe(1234)
  })

  it('throws WrongPinError when the holder is empty', async () => {
    const { inner, eventId, payerId } = await setup()
    const holder = new UnlockedPinHolder() // never set → get() === null
    const repo = new PinForwardingEventRepository(inner, holder)

    await expect(
      new AddExpenseHandler(repo).execute({
        eventId,
        paidBy: payerId,
        amountEuros: 10,
        description: 'Beer',
      }),
    ).rejects.toBeInstanceOf(WrongPinError)
  })

  it('throws WrongPinError when the holder carries the wrong PIN', async () => {
    const { inner, eventId, payerId } = await setup()
    const holder = new UnlockedPinHolder()
    holder.set(eventId, '9999')
    const repo = new PinForwardingEventRepository(inner, holder)

    await expect(
      new AddExpenseHandler(repo).execute({
        eventId,
        paidBy: payerId,
        amountEuros: 10,
        description: 'Beer',
      }),
    ).rejects.toBeInstanceOf(WrongPinError)
  })

  it('demonstrates the regression: WITHOUT the decorator the same edit fails', async () => {
    const { inner, eventId, payerId } = await setup()
    // Drive the handler straight over the bare repo, exactly as the 28
    // collaborative handlers did before the fix: update(..., null) → WrongPin.
    await expect(
      new AddExpenseHandler(inner).execute({
        eventId,
        paidBy: payerId,
        amountEuros: 10,
        description: 'Bread',
      }),
    ).rejects.toBeInstanceOf(WrongPinError)
  })
})
