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

export class DeleteManualLiquidationHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: DeleteManualLiquidationInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = DeleteManualLiquidationSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      if (!row.snapshot.users.some((u) => u.id === parsed.userId))
        throw new Error(`User ${parsed.userId} not in event`)
      const existing = row.snapshot.manualLiquidations.find((l) => l.id === parsed.liquidationId)
      if (!existing) throw new Error(`Manual liquidation ${parsed.liquidationId} not found`)
      if (existing.deleted) throw new Error('Cannot delete an already-deleted manual liquidation')

      const deleted = ManualLiquidation.restore(existing)
        .softDelete({ by: parsed.userId })
        .toSnapshot()
      const actorName = row.snapshot.users.find((u) => u.id === parsed.userId)?.name ?? 'Someone'
      return HistoryAppender.append(
        {
          ...row.snapshot,
          manualLiquidations: capTrash(
            row.snapshot.manualLiquidations.map((l) =>
              l.id === parsed.liquidationId ? deleted : l,
            ),
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
