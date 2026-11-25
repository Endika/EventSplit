import { describe, it, expect } from 'vitest'
import { DeleteManualLiquidationHandler } from '@/application/handlers/DeleteManualLiquidationHandler'
import { EditManualLiquidationHandler } from '@/application/handlers/EditManualLiquidationHandler'
import { RecoverManualLiquidationHandler } from '@/application/handlers/RecoverManualLiquidationHandler'
import { ToggleLiquidationShareHandler } from '@/application/handlers/ToggleLiquidationShareHandler'
import { addLiquidation, lastEntry, makeWorld } from '../../support/world'

describe('Manual liquidation mutations', () => {
  it('edits one liquidation, with or without a payer, leaving the other alone', async () => {
    const w = await makeWorld()
    const first = await addLiquidation(w, 'Deposit')
    const second = await addLiquidation(w, 'Rest')
    const handler = new EditManualLiquidationHandler(w.repo)
    const edit = (paidBy: string | null) =>
      handler.execute({
        eventId: w.eventId,
        userId: w.bob,
        liquidationId: second,
        concept: 'Rest of the house',
        amountEuros: 80,
        paidBy,
        affects: [w.john, w.bob],
      })

    const paid = await edit(w.john)
    expect(paid.event.manualLiquidations).toMatchObject([
      { id: first, concept: 'Deposit', cents: 4000 },
      {
        id: second,
        concept: 'Rest of the house',
        cents: 8000,
        paidBy: w.john,
        affects: [w.john, w.bob],
      },
    ])
    expect(lastEntry(paid.event)).toEqual({
      type: 'manual_liquidation_edited',
      userId: w.bob,
      description: 'Bob edited manual liquidation: Rest of the house',
    })

    const pending = await edit(null)
    expect(pending.event.manualLiquidations[1]!.paidBy).toBeNull()
  })

  it('toggles a share paid then unpaid, treating no affects as everyone', async () => {
    const w = await makeWorld()
    const first = await addLiquidation(w, 'Deposit')
    const everyone = await addLiquidation(w, 'Rest', { affects: [] })
    const handler = new ToggleLiquidationShareHandler(w.repo)
    const toggle = (liquidationId: string, shareUserId: string) =>
      handler.execute({ eventId: w.eventId, userId: w.alice, liquidationId, shareUserId })

    const on = await toggle(everyone, w.bob)
    expect(on.event.manualLiquidations).toMatchObject([
      { id: first, paidShares: [] },
      { id: everyone, paidShares: [w.bob] },
    ])
    expect(lastEntry(on.event)).toEqual({
      type: 'manual_liquidation_share_toggled',
      userId: w.alice,
      description: 'Alice updated paid shares of: Rest',
    })

    const off = await toggle(everyone, w.bob)
    expect(off.event.manualLiquidations[1]!.paidShares).toEqual([])
    const listed = await toggle(first, w.john)
    expect(listed.event.manualLiquidations[0]!.paidShares).toEqual([w.john])
  })

  it('soft-deletes then recovers only the chosen liquidation', async () => {
    const w = await makeWorld()
    const first = await addLiquidation(w, 'Deposit')
    const second = await addLiquidation(w, 'Rest')

    const del = await new DeleteManualLiquidationHandler(w.repo).execute({
      eventId: w.eventId,
      userId: w.alice,
      liquidationId: second,
    })
    expect(del.event.manualLiquidations).toMatchObject([
      { id: first, deleted: false, deletedBy: null },
      { id: second, deleted: true, deletedBy: w.alice },
    ])
    expect(lastEntry(del.event)).toEqual({
      type: 'manual_liquidation_deleted',
      userId: w.alice,
      description: 'Alice deleted manual liquidation: Rest',
    })

    const rec = await new RecoverManualLiquidationHandler(w.repo).execute({
      eventId: w.eventId,
      userId: w.bob,
      liquidationId: second,
    })
    expect(rec.event.manualLiquidations[1]).toMatchObject({ deleted: false, deletedBy: null })
    expect(lastEntry(rec.event)).toEqual({
      type: 'manual_liquidation_recovered',
      userId: w.bob,
      description: 'Bob recovered manual liquidation: Rest',
    })
  })
})
