import {
  EditManualLiquidationSchema,
  type EditManualLiquidationInput,
} from '@/application/dtos/EditManualLiquidationDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { ManualLiquidation } from '@/domain/entities/ManualLiquidation'
import { Money } from '@/domain/value-objects/Money'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { assertMember, memberName } from '@/application/support/eventMembers'

export class EditManualLiquidationHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: EditManualLiquidationInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditManualLiquidationSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.userId, 'User')
      if (parsed.paidBy !== null) assertMember(row.snapshot, parsed.paidBy, 'Payer')
      for (const id of parsed.affects) assertMember(row.snapshot, id, 'affects user')

      const existing = row.snapshot.manualLiquidations.find((l) => l.id === parsed.liquidationId)
      if (!existing) throw new Error(`Manual liquidation ${parsed.liquidationId} not found`)

      const edited = ManualLiquidation.restore(existing)
        .edit({
          concept: parsed.concept,
          amount: Money.fromEuros(parsed.amountEuros),
          paidBy: parsed.paidBy,
          affects: parsed.affects,
        })
        .toSnapshot()

      const actorName = memberName(row.snapshot, parsed.userId)
      return HistoryAppender.append(
        {
          ...row.snapshot,
          manualLiquidations: row.snapshot.manualLiquidations.map((l) =>
            l.id === parsed.liquidationId ? edited : l,
          ),
        },
        {
          type: 'manual_liquidation_edited',
          userId: parsed.userId,
          description: `${actorName} edited manual liquidation: ${parsed.concept}`,
        },
      )
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
