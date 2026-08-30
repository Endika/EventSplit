import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Casa rural', creatorName: 'Javi' })
  return { repo, eventId: create.event.id, javi: create.creator.id }
}

describe('AddManualLiquidationHandler', () => {
  it('adds a manual liquidation with a payer', async () => {
    const { repo, eventId, javi } = await setup()
    const res = await new AddManualLiquidationHandler(repo).execute({
      eventId,
      userId: javi,
      concept: 'Señal casa',
      amountEuros: 400,
      paidBy: javi,
      affects: [javi],
    })
    expect(res.event.manualLiquidations).toHaveLength(1)
    expect(res.event.manualLiquidations[0].cents).toBe(40000)
    expect(res.event.manualLiquidations[0].paidBy).toBe(javi)
  })

  it('adds a pending liquidation (no payer)', async () => {
    const { repo, eventId, javi } = await setup()
    const res = await new AddManualLiquidationHandler(repo).execute({
      eventId,
      userId: javi,
      concept: 'Resto casa',
      amountEuros: 400,
      paidBy: null,
      affects: [],
    })
    expect(res.event.manualLiquidations[0].paidBy).toBeNull()
  })

  it('rejects an unknown payer', async () => {
    const { repo, eventId, javi } = await setup()
    await expect(
      new AddManualLiquidationHandler(repo).execute({
        eventId,
        userId: javi,
        concept: 'Señal',
        amountEuros: 400,
        paidBy: '00000000-0000-7000-8000-000000000000',
        affects: [],
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
