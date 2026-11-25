import {
  RecoverManualLiquidationSchema,
  type RecoverManualLiquidationInput,
} from '@/application/dtos/RecoverManualLiquidationDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { ManualLiquidation } from '@/domain/entities/ManualLiquidation'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

export class RecoverManualLiquidationHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: RecoverManualLiquidationInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = RecoverManualLiquidationSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.userId, 'User')
      const existing = requireById(
        row.snapshot.manualLiquidations,
        parsed.liquidationId,
        'Manual liquidation',
      )

      const recovered = ManualLiquidation.restore(existing).recover().toSnapshot()
      const actorName = memberName(row.snapshot, parsed.userId)
      return HistoryAppender.append(
        {
          ...row.snapshot,
          manualLiquidations: replaceById(
            row.snapshot.manualLiquidations,
            parsed.liquidationId,
            recovered,
          ),
        },
        {
          type: 'manual_liquidation_recovered',
          userId: parsed.userId,
          description: `${actorName} recovered manual liquidation: ${existing.concept}`,
        },
      )
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
