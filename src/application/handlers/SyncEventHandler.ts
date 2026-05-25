import type { EventSnapshot } from '@/domain/entities/Event'

export interface SyncInput {
  local: { snapshot: EventSnapshot; version: number }
  remote: { snapshot: EventSnapshot; version: number }
}
export interface SyncResult {
  snapshot: EventSnapshot
  version: number
  applied: boolean
}

export class SyncEventHandler {
  merge(input: SyncInput): SyncResult {
    if (input.remote.version > input.local.version)
      return { snapshot: input.remote.snapshot, version: input.remote.version, applied: true }
    return { snapshot: input.local.snapshot, version: input.local.version, applied: false }
  }
}
