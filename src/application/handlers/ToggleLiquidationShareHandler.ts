import {
  ToggleLiquidationShareSchema,
  type ToggleLiquidationShareInput,
} from '@/application/dtos/ToggleLiquidationShareDTO'
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

export class ToggleLiquidationShareHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(
    input: ToggleLiquidationShareInput,
  ): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = ToggleLiquidationShareSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      assertMember(row.snapshot, parsed.userId, 'User')
      const existing = requireById(
        row.snapshot.manualLiquidations,
        parsed.liquidationId,
        'Manual liquidation',
      )
      const affected =
        existing.affects.length > 0 ? existing.affects : row.snapshot.users.map((u) => u.id)
      if (!affected.includes(parsed.shareUserId))
        throw new Error(`shareUserId ${parsed.shareUserId} not in liquidation affects`)

      const toggled = ManualLiquidation.restore(existing)
        .toggleShare(parsed.shareUserId)
        .toSnapshot()
      const actorName = memberName(row.snapshot, parsed.userId)
      return HistoryAppender.append(
        {
          ...row.snapshot,
          manualLiquidations: replaceById(
            row.snapshot.manualLiquidations,
            parsed.liquidationId,
            toggled,
          ),
        },
        {
          type: 'manual_liquidation_share_toggled',
          userId: parsed.userId,
          description: `${actorName} updated paid shares of: ${existing.concept}`,
        },
      )
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
