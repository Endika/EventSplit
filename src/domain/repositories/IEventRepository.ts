import type { EventSnapshot } from '@/domain/entities/Event'

export interface SaveResult {
  snapshot: EventSnapshot
  version: number
}

export class VersionConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super(`Version conflict: server is at ${currentVersion}`)
  }
}

export interface IEventRepository {
  findById(id: string): Promise<{ snapshot: EventSnapshot; version: number } | null>
  create(snapshot: EventSnapshot): Promise<SaveResult>
  update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
  ): Promise<SaveResult> // throws VersionConflictError on mismatch
}
