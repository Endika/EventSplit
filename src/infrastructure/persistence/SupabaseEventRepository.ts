import type { SupabaseClient } from '@supabase/supabase-js'
import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type SaveResult,
  VersionConflictError,
  StaleClientError,
} from '@/domain/repositories/IEventRepository'
import { parseEventSnapshot } from '@/infrastructure/persistence/EventSnapshotSchema'
import { SCHEMA_VERSION } from '@/infrastructure/persistence/schemaVersion'

export class SupabaseEventRepository implements IEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<{ snapshot: EventSnapshot; version: number } | null> {
    const { data, error } = await this.client
      .from('events')
      .select('data, version, active')
      .eq('id', id)
      .maybeSingle<{ data: unknown; version: number; active: boolean }>()
    if (error) throw error
    if (!data || !data.active) return null
    const parsed = parseEventSnapshot(data.data)
    return { snapshot: parsed, version: data.version }
  }

  async getVersion(id: string): Promise<number | null> {
    const { data, error } = await this.client
      .from('events')
      .select('version, active')
      .eq('id', id)
      .maybeSingle<{ version: number; active: boolean }>()
    if (error) throw error
    if (!data || !data.active) return null
    return data.version
  }

  async create(snapshot: EventSnapshot): Promise<SaveResult> {
    const row = {
      id: snapshot.id,
      name: snapshot.name,
      created_by: snapshot.createdBy,
      data: { ...snapshot, _schemaVersion: SCHEMA_VERSION },
      version: 1,
      updated_by: snapshot.createdBy,
    }
    const { data, error } = await this.client
      .from('events')
      .insert(row)
      .select('version')
      .single<{ version: number }>()
    if (error) throw error
    return { snapshot, version: data.version }
  }

  async update(id: string, snapshot: EventSnapshot, expectedVersion: number): Promise<SaveResult> {
    const { data, error } = await this.client
      .from('events')
      .update({
        data: { ...snapshot, _schemaVersion: SCHEMA_VERSION },
        name: snapshot.name,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select('version')
      .maybeSingle<{ version: number }>()
    if (error) {
      // PT426 → the guard trigger refused this write because our schema is
      // older than the stored event (PostgREST maps it to HTTP 426).
      if (error.code === 'PT426') throw new StaleClientError()
      throw error
    }
    if (!data) {
      // Only the version is needed here; probe it instead of re-downloading the
      // whole blob (withOptimisticRetry re-reads the snapshot on its next try).
      const version = await this.getVersion(id)
      throw new VersionConflictError(version ?? -1)
    }
    return { snapshot, version: data.version }
  }
}
