import type { EventSnapshot } from '@/domain/entities/Event'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'

export interface CachedEvent {
  snapshot: EventSnapshot
  version: number
}

export type RefreshResult =
  | { status: 'updated'; snapshot: EventSnapshot; version: number }
  | { status: 'unchanged'; snapshot: EventSnapshot; version: number }
  | { status: 'not_found' }

/**
 * Reconciles the local copy with the server while spending as little egress as
 * possible: the full snapshot is downloaded only when there is no local copy or
 * the remote version is strictly newer. Everything else costs a single cheap
 * version probe.
 */
export class RefreshEventHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: { eventId: string; local: CachedEvent | null }): Promise<RefreshResult> {
    const { eventId, local } = input

    if (!local) {
      const row = await this.repo.findById(eventId)
      return row ? { status: 'updated', ...row } : { status: 'not_found' }
    }

    const remoteVersion = await this.repo.getVersion(eventId)
    if (remoteVersion === null || remoteVersion <= local.version) {
      return { status: 'unchanged', snapshot: local.snapshot, version: local.version }
    }

    const row = await this.repo.findById(eventId)
    if (!row || row.version <= local.version) {
      return { status: 'unchanged', snapshot: local.snapshot, version: local.version }
    }
    return { status: 'updated', ...row }
  }
}
