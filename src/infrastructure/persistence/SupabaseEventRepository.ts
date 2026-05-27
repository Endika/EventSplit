import type { SupabaseClient } from '@supabase/supabase-js'
import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'
import { parseEventSnapshot } from '@/infrastructure/persistence/EventSnapshotSchema'

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
    return { snapshot: parsed as unknown as EventSnapshot, version: data.version }
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
      data: snapshot,
      version: 1,
      updated_by: snapshot.createdBy,
    }
    const { data, error } = await this.client
      .from('events')
      .insert(row)
      .select('data, version')
      .single<{ data: EventSnapshot; version: number }>()
    if (error) throw error
    return { snapshot: data.data, version: data.version }
  }

  async update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
  ): Promise<SaveResult> {
    const { data, error } = await this.client
      .from('events')
      .update({
        data: snapshot,
        name: snapshot.name,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select('data, version')
      .maybeSingle<{ data: EventSnapshot; version: number }>()
    if (error) throw error
    if (!data) {
      const current = await this.findById(id)
      throw new VersionConflictError(current?.version ?? -1)
    }
    return { snapshot: data.data, version: data.version }
  }
}
