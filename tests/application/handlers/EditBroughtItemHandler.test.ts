import { describe, it, expect } from 'vitest'
import { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import { EditBroughtItemHandler } from '@/application/handlers/EditBroughtItemHandler'
import { lastEntry, makeWorld } from '../../support/world'

describe('EditBroughtItemHandler', () => {
  it('edits one brought item, with or without bringer and subgroup, leaving the other alone', async () => {
    const w = await makeWorld()
    const add = new AddBroughtItemHandler(w.repo)
    const base = { eventId: w.eventId, createdBy: w.john, unit: 'units' as const }
    await add.execute({ ...base, item: 'Tortilla', quantity: 2, group: 'Breakfast' })
    const added = await add.execute({ ...base, item: 'Pan', quantity: 1, broughtBy: w.bob })
    const [tortilla, pan] = added.event.purchases
    const handler = new EditBroughtItemHandler(w.repo)

    const full = await handler.execute({
      eventId: w.eventId,
      purchaseId: pan!.id,
      editedBy: w.alice,
      item: 'Empanada',
      quantity: 5,
      unit: 'units',
      group: 'Lunch',
      subgroup: 'Salado',
      broughtBy: w.alice,
    })
    expect(full.event.purchases).toMatchObject([
      { id: tortilla!.id, item: 'Tortilla', group: 'Breakfast' },
      {
        id: pan!.id,
        item: 'Empanada',
        totalQuantity: 5,
        group: 'Lunch',
        subgroup: 'Salado',
        assignedTo: w.alice,
      },
    ])
    expect(lastEntry(full.event)).toEqual({
      type: 'purchase_edited',
      userId: w.alice,
      description: 'Alice edited Pan',
    })

    const bare = await handler.execute({
      eventId: w.eventId,
      purchaseId: pan!.id,
      editedBy: w.alice,
      item: 'Empanada',
      quantity: 5,
      unit: 'units',
    })
    expect(bare.event.purchases[1]).toMatchObject({
      group: null,
      subgroup: null,
      assignedTo: null,
    })
  })
})
