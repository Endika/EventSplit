import {
  DeleteManualLiquidationSchema,
  type DeleteManualLiquidationInput,
} from '@/application/dtos/DeleteManualLiquidationDTO'
import { type EventSnapshot } from '@/domain/entities/Event'
import { ManualLiquidation } from '@/domain/entities/ManualLiquidation'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import { capTrash } from '@/domain/services/capTrash'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import {
  assertMember,
  memberName,
  requireById,
  replaceById,
} from '@/application/support/snapshotLookups'

export class DeleteManualLiquidationHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: DeleteManualLiquidationInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeleteManualLiquidationSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.userId, 'User')
      const existing = requireById(
        row.snapshot.manualLiquidations,
        parsed.liquidationId,
        'Manual liquidation',
      )
      if (existing.deleted) throw new Error('Cannot delete an already-deleted manual liquidation')

      const deleted = ManualLiquidation.restore(existing)
        .softDelete({ by: parsed.userId })
        .toSnapshot()
      const actorName = memberName(row.snapshot, parsed.userId)
      return HistoryAppender.append(
        {
          ...row.snapshot,
          manualLiquidations: capTrash(
            replaceById(row.snapshot.manualLiquidations, parsed.liquidationId, deleted),
          ),
        },
        {
          type: 'manual_liquidation_deleted',
          userId: parsed.userId,
          description: `${actorName} deleted manual liquidation: ${existing.concept}`,
        },
      )
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
