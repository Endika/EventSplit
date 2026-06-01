import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import { EditManualLiquidationHandler } from '@/application/handlers/EditManualLiquidationHandler'
import { DeleteManualLiquidationHandler } from '@/application/handlers/DeleteManualLiquidationHandler'
import { RecoverManualLiquidationHandler } from '@/application/handlers/RecoverManualLiquidationHandler'
import { ToggleLiquidationShareHandler } from '@/application/handlers/ToggleLiquidationShareHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setupWithLiq() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Casa rural', creatorName: 'Javi' })
  const javi = create.creator.id
  const eventId = create.event.id
  const added = await new AddManualLiquidationHandler(repo).execute({
    eventId,
    userId: javi,
    concept: 'Señal casa',
    amountEuros: 400,
    paidBy: javi,
    affects: [javi],
  })
  return { repo, eventId, javi, liqId: added.event.manualLiquidations[0].id }
}

describe('Manual liquidation mutations', () => {
  it('edits concept and amount', async () => {
    const { repo, eventId, javi, liqId } = await setupWithLiq()
    const res = await new EditManualLiquidationHandler(repo).execute({
      eventId,
      userId: javi,
      liquidationId: liqId,
      concept: 'Señal casa rural',
      amountEuros: 800,
      paidBy: javi,
      affects: [javi],
    })
    const liq = res.event.manualLiquidations.find((l) => l.id === liqId)!
    expect(liq.concept).toBe('Señal casa rural')
    expect(liq.cents).toBe(80000)
  })

  it('toggles a share paid then unpaid', async () => {
    const { repo, eventId, javi, liqId } = await setupWithLiq()
    const on = await new ToggleLiquidationShareHandler(repo).execute({
      eventId,
      userId: javi,
      liquidationId: liqId,
      shareUserId: javi,
    })
    expect(on.event.manualLiquidations[0].paidShares).toEqual([javi])
    const off = await new ToggleLiquidationShareHandler(repo).execute({
      eventId,
      userId: javi,
      liquidationId: liqId,
      shareUserId: javi,
    })
    expect(off.event.manualLiquidations[0].paidShares).toEqual([])
  })

  it('soft-deletes then recovers', async () => {
    const { repo, eventId, javi, liqId } = await setupWithLiq()
    const del = await new DeleteManualLiquidationHandler(repo).execute({
      eventId,
      userId: javi,
      liquidationId: liqId,
    })
    expect(del.event.manualLiquidations[0].deleted).toBe(true)
    const rec = await new RecoverManualLiquidationHandler(repo).execute({
      eventId,
      userId: javi,
      liquidationId: liqId,
    })
    expect(rec.event.manualLiquidations[0].deleted).toBe(false)
  })

  it('rejects edit of an unknown liquidation', async () => {
    const { repo, eventId, javi } = await setupWithLiq()
    await expect(
      new EditManualLiquidationHandler(repo).execute({
        eventId,
        userId: javi,
        liquidationId: 'nope',
        concept: 'x x x',
        amountEuros: 1,
        paidBy: null,
        affects: [],
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects deleting an already-deleted liquidation', async () => {
    const { repo, eventId, javi, liqId } = await setupWithLiq()
    await new DeleteManualLiquidationHandler(repo).execute({ eventId, userId: javi, liquidationId: liqId })
    await expect(
      new DeleteManualLiquidationHandler(repo).execute({ eventId, userId: javi, liquidationId: liqId }),
    ).rejects.toThrow(/already-deleted/i)
  })
})
