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
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

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

      const existing = requireById(
        row.snapshot.manualLiquidations,
        parsed.liquidationId,
        'Manual liquidation',
      )

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
          manualLiquidations: replaceById(
            row.snapshot.manualLiquidations,
            parsed.liquidationId,
            edited,
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
