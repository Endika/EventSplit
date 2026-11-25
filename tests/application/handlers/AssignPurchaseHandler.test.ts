import { describe, it, expect } from 'vitest'
import { AssignPurchaseHandler } from '@/application/handlers/AssignPurchaseHandler'
import { addPurchase, lastEntry, makeWorld } from '../../support/world'

describe('AssignPurchaseHandler', () => {
  it('assigns a buyer and marks purchased, then unassigns, leaving other purchases alone', async () => {
    const w = await makeWorld()
    const first = await addPurchase(w, 'Coke')
    const second = await addPurchase(w, 'Beer')
    const handler = new AssignPurchaseHandler(w.repo)

    const assigned = await handler.execute({
      eventId: w.eventId,
      purchaseId: second,
      editedBy: w.alice,
      assignedTo: w.bob,
      purchased: true,
    })
    expect(assigned.event.purchases).toMatchObject([
      { id: first, assignedTo: null, purchased: false },
      { id: second, assignedTo: w.bob, purchased: true },
    ])
    expect(lastEntry(assigned.event)).toEqual({
      type: 'purchase_edited',
      userId: w.alice,
      description: 'Alice updated Beer assignment',
    })

    const cleared = await handler.execute({
      eventId: w.eventId,
      purchaseId: second,
      editedBy: w.alice,
      assignedTo: null,
      purchased: false,
    })
    expect(cleared.event.purchases[1]).toMatchObject({ assignedTo: null, purchased: false })
  })
})
