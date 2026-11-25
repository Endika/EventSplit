import { describe, it, expect } from 'vitest'
import { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import { lastEntry, makeWorld } from '../../support/world'

describe('AddManualLiquidationHandler', () => {
  it('adds liquidations with and without a payer', async () => {
    const w = await makeWorld()
    const handler = new AddManualLiquidationHandler(w.repo)
    const paid = await handler.execute({
      eventId: w.eventId,
      userId: w.john,
      concept: 'Señal casa',
      amountEuros: 400,
      paidBy: w.alice,
      affects: [w.john, w.bob],
    })
    expect(lastEntry(paid.event)).toEqual({
      type: 'manual_liquidation_added',
      userId: w.john,
      description: 'John added a manual liquidation: Señal casa',
    })

    const pending = await handler.execute({
      eventId: w.eventId,
      userId: w.bob,
      concept: 'Resto casa',
      amountEuros: 400,
      paidBy: null,
      affects: [],
    })
    expect(pending.event.manualLiquidations).toMatchObject([
      { concept: 'Señal casa', cents: 40000, paidBy: w.alice, affects: [w.john, w.bob] },
      { concept: 'Resto casa', cents: 40000, paidBy: null, affects: [] },
    ])
  })
})
