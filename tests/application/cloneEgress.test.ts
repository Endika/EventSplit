import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { CloneIntoEventHandler } from '@/application/handlers/CloneIntoEventHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { CountingRepository } from '../support/CountingRepository'

async function seed(repo: InMemoryEventRepository, itemCount: number) {
  const source = await new CreateEventHandler(repo).execute({
    name: 'Viaje anterior',
    creatorName: 'John',
  })
  const ana = await new JoinAsNewUserHandler(repo).execute({
    eventId: source.event.id,
    name: 'Ana',
  })
  await new SetDayOptionsHandler(repo).execute({
    eventId: source.event.id,
    options: [
      { start: '2026-06-05', end: '2026-06-05', note: null },
      { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
    ],
  })
  let last = source.event
  for (let i = 0; i < itemCount; i++) {
    const added = await new AddPurchaseHandler(repo).execute({
      eventId: source.event.id,
      createdBy: source.creator.id,
      item: `Item ${i + 1}`,
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: source.creator.id, multiplier: 1 }],
      days: 2,
    })
    last = added.event
  }
  const target = await new CreateEventHandler(repo).execute({
    name: 'Viaje nuevo',
    creatorName: 'Iker',
  })
  return {
    sourceId: source.event.id,
    targetId: target.event.id,
    me: target.creator.id,
    anaId: ana.newUser.id,
    purchaseIds: last.purchases.map((p) => p.id),
  }
}

describe('clone egress', () => {
  it('cloning the four blocks costs one read of the source and one write', async () => {
    const inner = new InMemoryEventRepository()
    const ctx = await seed(inner, 3)
    const repo = new CountingRepository(inner)

    await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: {
        dayOptions: true,
        userIds: [ctx.anaId],
        mergeUserIds: [],
        purchaseIds: ctx.purchaseIds,
        site: {
          location: true,
          emergencyContact: true,
          wifiPassword: true,
          generalNotes: true,
        },
      },
    })

    expect(repo.updates).toBe(1)
    // The source once, plus the target read the optimistic write does.
    expect(repo.reads).toBeLessThanOrEqual(2)
  })

  it('cloning 30 items costs the same single write as cloning one', async () => {
    const inner = new InMemoryEventRepository()
    const ctx = await seed(inner, 30)
    const repo = new CountingRepository(inner)

    await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: {
        dayOptions: false,
        userIds: [],
        mergeUserIds: [],
        purchaseIds: ctx.purchaseIds,
        site: {
          location: false,
          emergencyContact: false,
          wifiPassword: false,
          generalNotes: false,
        },
      },
    })

    expect(ctx.purchaseIds).toHaveLength(30)
    expect(repo.updates).toBe(1)
  })
})
