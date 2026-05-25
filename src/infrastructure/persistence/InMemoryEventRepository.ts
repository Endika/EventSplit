import type { EventSnapshot } from '@/domain/entities/Event'
import {
  type IEventRepository,
  type SaveResult,
  VersionConflictError,
} from '@/domain/repositories/IEventRepository'

interface Row {
  snapshot: EventSnapshot
  version: number
}

export class InMemoryEventRepository implements IEventRepository {
  private rows = new Map<string, Row>()

  async findById(id: string): Promise<Row | null> {
    const row = this.rows.get(id)
    return row ? { snapshot: structuredClone(row.snapshot), version: row.version } : null
  }

  async create(snapshot: EventSnapshot): Promise<SaveResult> {
    if (this.rows.has(snapshot.id)) throw new Error('Event already exists')
    const row: Row = { snapshot: structuredClone(snapshot), version: 1 }
    this.rows.set(snapshot.id, row)
    return { snapshot: structuredClone(row.snapshot), version: row.version }
  }

  async update(id: string, snapshot: EventSnapshot, expectedVersion: number): Promise<SaveResult> {
    const row = this.rows.get(id)
    if (!row) throw new Error('Event not found')
    if (row.version !== expectedVersion) throw new VersionConflictError(row.version)
    row.snapshot = structuredClone(snapshot)
    row.version += 1
    return { snapshot: structuredClone(row.snapshot), version: row.version }
  }
}
