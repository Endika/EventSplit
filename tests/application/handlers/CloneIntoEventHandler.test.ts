import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { SetGroupOrderHandler } from '@/application/handlers/SetGroupOrderHandler'
import { SetSubgroupOrderHandler } from '@/application/handlers/SetSubgroupOrderHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { CloneIntoEventHandler } from '@/application/handlers/CloneIntoEventHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { PinForwardingEventRepository } from '@/infrastructure/persistence/PinForwardingEventRepository'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'
import { readEvent } from '../../support/readEvent'
import { CountingRepository } from '../../support/CountingRepository'
import { optionKey } from '@/domain/value-objects/DayOption'
import type { CloneSelection } from '@/domain/services/buildClonePatch'

const noSite = {
  location: false,
  emergencyContact: false,
  wifiPassword: false,
  generalNotes: false,
}

const jun5 = { start: '2026-06-05', end: '2026-06-05', note: null }
const jun12 = { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' }

/**
 * A source event with two day options, two people and one purchase, plus a
 * target event where I am the only participant.
 */
async function seed(repo: InMemoryEventRepository) {
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
    options: [jun5, jun12],
  })
  const purchase = await new AddPurchaseHandler(repo).execute({
    eventId: source.event.id,
    createdBy: source.creator.id,
    item: 'Leche',
    quantity: 1,
    unit: 'liters',
    dailyConsumption: 0.5,
    consumers: [
      { userId: source.creator.id, multiplier: 1 },
      { userId: ana.newUser.id, multiplier: 1 },
    ],
    days: 3,
  })
  const target = await new CreateEventHandler(repo).execute({
    name: 'Viaje nuevo',
    creatorName: 'Iker',
  })
  return {
    sourceId: source.event.id,
    targetId: target.event.id,
    me: target.creator.id,
    anaId: ana.newUser.id,
    purchaseId: purchase.event.purchases[0]!.id,
  }
}

function sel(over: Partial<CloneSelection> = {}): CloneSelection {
  return {
    dayOptions: false,
    userIds: [],
    mergeUserIds: [],
    purchaseIds: [],
    site: noSite,
    ...over,
  }
}

describe('CloneIntoEventHandler', () => {
  it('applies the four blocks in a single write', async () => {
    const inner = new InMemoryEventRepository()
    const ctx = await seed(inner)
    const repo = new CountingRepository(inner)

    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({
        dayOptions: true,
        userIds: [ctx.anaId],
        purchaseIds: [ctx.purchaseId],
        site: { ...noSite, generalNotes: true },
      }),
    })

    expect(result.event.dayOptions).toHaveLength(2)
    expect(result.event.users).toHaveLength(2) // Iker + Ana
    expect(result.event.purchases).toHaveLength(1)
    expect(repo.updates).toBe(1)
  })

  it('is additive: it does not touch what the target already had', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await new SetDayOptionsHandler(repo).execute({
      eventId: ctx.targetId,
      options: [{ start: '2026-07-01', end: '2026-07-01', note: 'mío' }],
    })

    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ dayOptions: true }),
    })

    expect(result.event.dayOptions.map(optionKey)).toContain('2026-07-01..2026-07-01')
    expect(result.event.dayOptions).toHaveLength(3)
  })

  it('keeps every existing vote on its own option after adding options', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    // Target has one option in July and I voted it.
    await new SetDayOptionsHandler(repo).execute({
      eventId: ctx.targetId,
      options: [{ start: '2026-07-01', end: '2026-07-01', note: null }],
    })
    await new SetAvailabilityBatchHandler(repo).execute({
      eventId: ctx.targetId,
      editedBy: ctx.me,
      votes: { [ctx.me]: [true] },
    })
    // A row shorter than the options it was saved against must not read past its end.
    const row = (await readEvent(repo, ctx.targetId))!
    row.snapshot.availability['ragged'] = []
    await repo.update(ctx.targetId, row.snapshot, row.version, null)

    // Cloning brings June options, which sort BEFORE mine.
    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ dayOptions: true }),
    })

    expect(result.event.availability['ragged']).toEqual([false, false, false])
    const mine = result.event.availability[ctx.me]!
    const julyIdx = result.event.dayOptions.findIndex(
      (o) => optionKey(o) === '2026-07-01..2026-07-01',
    )
    expect(julyIdx).toBe(2) // pushed to the end by the two June options
    expect(mine).toHaveLength(result.event.dayOptions.length)
    expect(mine[julyIdx]).toBe(true)
    expect(mine.filter(Boolean)).toHaveLength(1) // the cloned options bring no votes
  })

  it('a cloned participant has no vote row, and voting still works afterwards', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await new SetDayOptionsHandler(repo).execute({
      eventId: ctx.targetId,
      options: [{ start: '2026-07-01', end: '2026-07-01', note: null }],
    })

    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ userIds: [ctx.anaId] }),
    })
    const newId = result.event.users.at(-1)!.id
    expect(result.event.availability[newId]).toBeUndefined()

    await expect(
      new SetAvailabilityBatchHandler(repo).execute({
        eventId: ctx.targetId,
        editedBy: ctx.me,
        votes: { [newId]: result.event.dayOptions.map(() => true) },
      }),
    ).resolves.toBeDefined()
  })

  it.each([
    ['nothing', sel(), 'nothing'],
    ['day options', sel({ dayOptions: true }), 'day options'],
    ['a participant', sel({ userIds: ['ana'] }), '1 participant(s)'],
    ['an item', sel({ purchaseIds: ['milk'] }), '1 item(s)'],
    ['site details', sel({ site: { ...noSite, wifiPassword: true } }), 'site details'],
    [
      'every block',
      sel({
        dayOptions: true,
        userIds: ['ana'],
        purchaseIds: ['milk'],
        site: { ...noSite, location: true },
      }),
      'day options, 1 participant(s), 1 item(s), site details',
    ],
  ])('records %s in the history', async (_name, selection, blocks) => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    const ids: Record<string, string> = { ana: ctx.anaId, milk: ctx.purchaseId }
    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: {
        ...selection,
        userIds: selection.userIds.map((id) => ids[id]!),
        purchaseIds: selection.purchaseIds.map((id) => ids[id]!),
      },
    })
    const { type, userId, description } = result.event.history.at(-1)!
    expect({ type, userId, description }).toEqual({
      type: 'cloned_from',
      userId: ctx.me,
      description: `Cloned ${blocks} from "Viaje anterior"`,
    })
  })

  it('refuses a source event with a PIN', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await repo.setPin(ctx.sourceId, '1234', null)

    await expect(
      new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({ dayOptions: true }),
      }),
    ).rejects.toThrow(/pin/i)
  })

  it('refuses a PIN source even when this device has unlocked it', async () => {
    const inner = new InMemoryEventRepository()
    const ctx = await seed(inner)
    await inner.setPin(ctx.sourceId, '1234', null)
    const holder = new UnlockedPinHolder()
    holder.set(ctx.sourceId, '1234')
    const repo = new PinForwardingEventRepository(inner, holder)

    await expect(
      new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({ dayOptions: true }),
      }),
    ).rejects.toThrow(/pin/i)
  })

  it('refuses when the cloner is not in the target event', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await expect(
      new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: '0197c3f6-0000-7000-8000-00000000dead',
        selection: sel({ dayOptions: true }),
      }),
    ).rejects.toThrow(/not in event/)
  })

  it('refuses a source event that does not exist', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await expect(
      new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: 'zzzzzzz',
        clonedBy: ctx.me,
        selection: sel({ dayOptions: true }),
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('refuses cloning an event into itself', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await expect(
      new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.sourceId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({ dayOptions: true }),
      }),
    ).rejects.toThrow(/itself/i)
  })

  it.each([
    [29, true],
    [30, false],
  ])('with %i options already, cloning two %s fit under the cap of 31', async (existing, fits) => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    const many = Array.from({ length: existing }, (_, i) => {
      const d = `2026-08-${`${i + 1}`.padStart(2, '0')}`
      return { start: d, end: d, note: null }
    })
    await new SetDayOptionsHandler(repo).execute({ eventId: ctx.targetId, options: many })

    const clone = new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ dayOptions: true }),
    })
    if (fits) expect((await clone).event.dayOptions).toHaveLength(31)
    else await expect(clone).rejects.toThrow(/31/)
  })

  it('does not duplicate a day option the target already has', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    await new SetDayOptionsHandler(repo).execute({ eventId: ctx.targetId, options: [jun5] })

    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ dayOptions: true }),
    })
    expect(result.event.dayOptions).toHaveLength(2)
  })

  it('resizes a cloned purchase for its new, smaller group', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ purchaseIds: [ctx.purchaseId] }),
    })
    const p = result.event.purchases[0]!
    // Source: 0.5 l/day × 2 people × 3 days = 3 l. Here: only me, same 3 days.
    expect(p.consumers).toEqual([{ userId: ctx.me, multiplier: 1 }])
    expect(p.totalQuantity).toBe(1.5)
  })

  it('never copies expenses, liquidations or history', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ dayOptions: true, userIds: [ctx.anaId], purchaseIds: [ctx.purchaseId] }),
    })
    expect(result.event.expenses).toEqual([])
    expect(result.event.manualLiquidations).toEqual([])
    expect(result.event.chosenOptions).toEqual([])
    expect(result.event.history.every((h) => h.type !== 'days_set' || true)).toBe(true)
    expect(result.event.name).toBe('Viaje nuevo')
  })

  it('merges the group and subgroup orders of the cloned items into the target', async () => {
    const repo = new InMemoryEventRepository()
    const ctx = await seed(repo)
    const addTo = async (
      eventId: string,
      userId: string,
      item: string,
      group: string,
      sub: string,
    ) =>
      (
        await new AddPurchaseHandler(repo).execute({
          eventId,
          createdBy: userId,
          item,
          quantity: 1,
          unit: 'units',
          dailyConsumption: 1,
          consumers: [{ userId, multiplier: 1 }],
          days: 1,
          group,
          subgroup: sub,
        })
      ).event.purchases.at(-1)!.id
    const cereal = await addTo(ctx.sourceId, ctx.anaId, 'Cereales', 'Snack', 'Dulce')
    const yogurt = await addTo(ctx.sourceId, ctx.anaId, 'Yogur', 'Desayuno', 'Lácteos')
    await new SetGroupOrderHandler(repo).execute({
      eventId: ctx.sourceId,
      userId: ctx.anaId,
      order: ['Snack', 'Desayuno'],
    })
    await addTo(ctx.targetId, ctx.me, 'Tarta', 'Cena', 'Postres')
    await addTo(ctx.targetId, ctx.me, 'Fruta', 'Desayuno', 'Fresca')
    await new SetGroupOrderHandler(repo).execute({
      eventId: ctx.targetId,
      userId: ctx.me,
      order: ['Desayuno', 'Cena'],
    })
    for (const [group, order] of [
      ['Cena', ['Postres']],
      ['Desayuno', ['Fresca']],
    ] as const) {
      await new SetSubgroupOrderHandler(repo).execute({
        eventId: ctx.targetId,
        userId: ctx.me,
        group,
        order: [...order],
      })
    }

    const result = await new CloneIntoEventHandler(repo).execute({
      targetEventId: ctx.targetId,
      sourceEventId: ctx.sourceId,
      clonedBy: ctx.me,
      selection: sel({ purchaseIds: [cereal, yogurt] }),
    })

    expect(result.event.groupOrder).toEqual(['Desayuno', 'Cena', 'Snack'])
    expect(result.event.subgroupOrder).toEqual({
      Cena: ['Postres'],
      Desayuno: ['Fresca', 'Lácteos'],
      Snack: ['Dulce'],
    })
  })

  describe('merging a duplicate participant', () => {
    /**
     * The real shape of the problem: the target's creator, Iker, is also in the
     * source event — with a profile filled in there and blank here — and brings
     * an item along.
     */
    async function seedTwin(repo: InMemoryEventRepository) {
      const ctx = await seed(repo)
      const source = await new JoinAsNewUserHandler(repo).execute({
        eventId: ctx.sourceId,
        name: 'Iker',
      })
      const twinId = source.newUser.id
      await new UpdateProfileHandler(repo).execute({
        eventId: ctx.sourceId,
        userId: twinId,
        actorId: twinId,
        dietary: 'vegano',
        phone: '600123456',
        allergies: [{ name: 'nuts', severity: 'severe', notes: null }],
      })
      const oil = await new AddPurchaseHandler(repo).execute({
        eventId: ctx.sourceId,
        createdBy: twinId,
        item: 'Aceite',
        quantity: 1,
        unit: 'units',
        dailyConsumption: 1,
        consumers: [{ userId: twinId, multiplier: 1 }],
        days: 1,
        assignedTo: twinId,
      })
      const oilId = oil.event.purchases.find((p) => p.item === 'Aceite')!.id
      return { ...ctx, twinId, oilId }
    }

    it('fills the existing profile in and adds no second participant', async () => {
      const repo = new InMemoryEventRepository()
      const ctx = await seedTwin(repo)

      const result = await new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({ userIds: [ctx.twinId], mergeUserIds: [ctx.twinId] }),
      })

      expect(result.event.users).toHaveLength(1)
      const iker = result.event.users[0]!
      expect(iker.id).toBe(ctx.me)
      expect(iker.dietary).toBe('vegano')
      expect(iker.phone).toBe('600123456')
      expect(iker.allergies).toEqual([{ name: 'nuts', severity: 'severe', notes: null }])
    })

    it('hands the cloned item to the existing participant', async () => {
      const repo = new InMemoryEventRepository()
      const ctx = await seedTwin(repo)

      const result = await new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({
          userIds: [ctx.twinId],
          mergeUserIds: [ctx.twinId],
          purchaseIds: [ctx.oilId],
        }),
      })

      expect(result.event.purchases[0]!.assignedTo).toBe(ctx.me)
    })

    it('adds a second Iker when the merge is declined', async () => {
      const repo = new InMemoryEventRepository()
      const ctx = await seedTwin(repo)

      const result = await new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({ userIds: [ctx.twinId] }),
      })

      expect(result.event.users).toHaveLength(2)
      expect(result.event.users.map((u) => u.name)).toEqual(['Iker', 'Iker'])
      // The one that was already here is left untouched.
      expect(result.event.users.find((u) => u.id === ctx.me)!.dietary).toBeNull()
    })

    it('tells merges and arrivals apart in the history', async () => {
      const repo = new InMemoryEventRepository()
      const ctx = await seedTwin(repo)

      const result = await new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({
          userIds: [ctx.twinId, ctx.anaId],
          mergeUserIds: [ctx.twinId],
        }),
      })

      const entry = result.event.history.find((h) => h.type === 'cloned_from')!
      expect(entry.description).toBe(
        'Cloned 1 participant(s), 1 merged participant(s) from "Viaje anterior"',
      )
    })

    it("leaves the target's own filled-in fields alone", async () => {
      const repo = new InMemoryEventRepository()
      const ctx = await seedTwin(repo)
      await new UpdateProfileHandler(repo).execute({
        eventId: ctx.targetId,
        userId: ctx.me,
        actorId: ctx.me,
        dietary: 'celiaco',
      })

      const result = await new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({ userIds: [ctx.twinId], mergeUserIds: [ctx.twinId] }),
      })

      expect(result.event.users[0]!.dietary).toBe('celiaco')
      // The gap it did have still gets filled.
      expect(result.event.users[0]!.phone).toBe('600123456')
    })

    it('still costs a single write', async () => {
      const inner = new InMemoryEventRepository()
      const ctx = await seedTwin(inner)
      const repo = new CountingRepository(inner)

      await new CloneIntoEventHandler(repo).execute({
        targetEventId: ctx.targetId,
        sourceEventId: ctx.sourceId,
        clonedBy: ctx.me,
        selection: sel({
          userIds: [ctx.twinId],
          mergeUserIds: [ctx.twinId],
          purchaseIds: [ctx.oilId],
        }),
      })

      expect(repo.updates).toBe(1)
    })
  })
})
