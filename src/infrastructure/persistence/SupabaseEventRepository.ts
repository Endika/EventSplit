import type { SupabaseClient } from '@supabase/supabase-js'
import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type ReadResult,
  type SaveResult,
  VersionConflictError,
  StaleClientError,
  WrongPinError,
  PayloadTooLargeError,
  RateLimitedError,
} from '@/domain/repositories/IEventRepository'
import { parseEventSnapshot } from '@/infrastructure/persistence/EventSnapshotSchema'
import { SCHEMA_VERSION } from '@/infrastructure/persistence/schemaVersion'

/** Map a PostgREST error (PTxyz SQLSTATE) raised by the RPCs to a domain error. */
function mapRpcError(error: { code?: string } | null): Error | null {
  if (!error) return null
  switch (error.code) {
    case 'PT401':
      return new WrongPinError()
    case 'PT413':
      return new PayloadTooLargeError()
    case 'PT429':
      return new RateLimitedError()
    case 'PT426':
      return new StaleClientError()
    default:
      return error as unknown as Error
  }
}

interface GetEventPayload {
  data: unknown
  version: number
  hasPin: boolean
}

/**
 * Build the JSONB blob for a write. `hasPin` is a derived read field — the PIN
 * hash lives in a server-side column, so it never goes back into the blob. The
 * server strips it defensively too, but we keep the wire payload clean.
 */
function toWriteBlob(snapshot: EventSnapshot): Record<string, unknown> {
  const { hasPin: _hasPin, ...rest } = snapshot
  void _hasPin
  return { ...rest, _schemaVersion: SCHEMA_VERSION }
}

export class SupabaseEventRepository implements IEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<ReadResult | null> {
    const { data, error } = await this.client.rpc('get_event', { p_id: id })
    if (error) throw error
    if (!data) return null
    const payload = data as GetEventPayload
    const snapshot = parseEventSnapshot(payload.data)
    snapshot.hasPin = payload.hasPin
    return { snapshot, version: payload.version, hasPin: payload.hasPin }
  }

  async getVersion(id: string): Promise<number | null> {
    const { data, error } = await this.client.rpc('get_event_version', { p_id: id })
    if (error) throw error
    return (data as number | null) ?? null
  }

  async create(snapshot: EventSnapshot): Promise<SaveResult> {
    const { data, error } = await this.client.rpc('create_event', {
      p_id: snapshot.id,
      p_data: toWriteBlob(snapshot),
      p_name: snapshot.name,
      p_created_by: snapshot.createdBy,
    })
    const mapped = mapRpcError(error)
    if (mapped) throw mapped
    return { snapshot, version: (data as number) ?? 1 }
  }

  async update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult> {
    const { data, error } = await this.client.rpc('update_event', {
      p_id: id,
      p_data: toWriteBlob(snapshot),
      p_name: snapshot.name,
      p_expected_version: expectedVersion,
      p_pin: pin,
    })
    if (error) {
      // PT409 → the optimistic CAS lost the version race. Re-probe the current
      // version so withOptimisticRetry can re-read and try again.
      if ((error as { code?: string }).code === 'PT409') {
        const version = await this.getVersion(id)
        throw new VersionConflictError(version ?? -1)
      }
      const mapped = mapRpcError(error)
      if (mapped) throw mapped
    }
    return { snapshot, version: (data as number) ?? expectedVersion + 1 }
  }

  async setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void> {
    const { error } = await this.client.rpc('set_event_pin', {
      p_id: id,
      p_new_pin: newPin,
      p_current_pin: currentPin,
    })
    const mapped = mapRpcError(error)
    if (mapped) throw mapped
  }

  async verifyPin(id: string, pin: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('verify_event_pin', { p_id: id, p_pin: pin })
    const mapped = mapRpcError(error)
    if (mapped) throw mapped
    return data === true
  }

  async deleteEvent(id: string, pin: string | null): Promise<void> {
    const { error } = await this.client.rpc('delete_event', { p_id: id, p_pin: pin })
    const mapped = mapRpcError(error)
    if (mapped) throw mapped
  }
}
