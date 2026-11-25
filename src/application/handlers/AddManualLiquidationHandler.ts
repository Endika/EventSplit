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
import { assertMember, memberName } from '@/application/support/eventMembers'

export class AddManualLiquidationHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: AddManualLiquidationInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = AddManualLiquidationSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.userId, 'User')
      if (parsed.paidBy !== null) assertMember(row.snapshot, parsed.paidBy, 'Payer')
      for (const id of parsed.affects) assertMember(row.snapshot, id, 'affects user')

      const liq = ManualLiquidation.create({
        concept: parsed.concept,
        amount: Money.fromEuros(parsed.amountEuros),
        paidBy: parsed.paidBy,
        affects: parsed.affects,
      })
      const actorName = memberName(row.snapshot, parsed.userId)
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
