import {
  AddManualLiquidationSchema,
  type AddManualLiquidationInput,
} from '@/application/dtos/AddManualLiquidationDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { ManualLiquidation } from '@/domain/entities/ManualLiquidation'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export class AddManualLiquidationHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: AddManualLiquidationInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AddManualLiquidationSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const knownIds = new Set(row.snapshot.users.map((u) => u.id))
      if (!knownIds.has(parsed.userId)) throw new Error(`User ${parsed.userId} not in event`)
      if (parsed.paidBy !== null && !knownIds.has(parsed.paidBy))
        throw new Error(`Payer ${parsed.paidBy} not in event`)
      for (const id of parsed.affects)
        if (!knownIds.has(id)) throw new Error(`affects user ${id} not in event`)

      const liq = ManualLiquidation.create({
        concept: parsed.concept,
        amount: Money.fromEuros(parsed.amountEuros),
        paidBy: parsed.paidBy,
        affects: parsed.affects,
      })
      const actorName = row.snapshot.users.find((u) => u.id === parsed.userId)?.name ?? 'Someone'
      return HistoryAppender.append(
        {
          ...row.snapshot,
          manualLiquidations: [...row.snapshot.manualLiquidations, liq.toSnapshot()],
        },
        {
          type: 'manual_liquidation_added',
          userId: parsed.userId,
          description: `${actorName} added a manual liquidation: ${parsed.concept}`,
        },
      )
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
