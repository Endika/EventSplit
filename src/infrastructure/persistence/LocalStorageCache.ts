import type { EventSnapshot } from '@/domain/entities/Event'

const EVENT_KEY = (id: string) => `eventsplit.event.${id}`
const IDENT_KEY = (id: string) => `eventsplit.identity.${id}`

export interface CachedEvent {
  snapshot: EventSnapshot
  version: number
}

export interface CachedIdentity {
  id: string
  name: string
  alias: string | null
}

export interface CachedEventSummary {
  id: string
  name: string
  updatedAt: string
  participantCount: number
  version: number
}

export class LocalStorageCache {
  get(eventId: string): CachedEvent | null {
    const raw = localStorage.getItem(EVENT_KEY(eventId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as CachedEvent
    } catch {
      return null
    }
  }

  set(eventId: string, payload: CachedEvent): void {
    localStorage.setItem(EVENT_KEY(eventId), JSON.stringify(payload))
  }

  getIdentity(eventId: string): CachedIdentity | null {
    const raw = localStorage.getItem(IDENT_KEY(eventId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as CachedIdentity
    } catch {
      return null
    }
  }

  setIdentity(eventId: string, identity: CachedIdentity): void {
    localStorage.setItem(IDENT_KEY(eventId), JSON.stringify(identity))
  }

  listAll(): CachedEventSummary[] {
    const summaries: CachedEventSummary[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('eventsplit.event.')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const cached = JSON.parse(raw) as CachedEvent
        summaries.push({
          id: cached.snapshot.id,
          name: cached.snapshot.name,
          updatedAt: cached.snapshot.updatedAt,
          participantCount: cached.snapshot.users.length,
          version: cached.version,
        })
      } catch {
        // skip corrupted entries
      }
    }
    // Sort by updatedAt descending (most recent first)
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  remove(eventId: string): void {
    localStorage.removeItem(EVENT_KEY(eventId))
    localStorage.removeItem(IDENT_KEY(eventId))
  }
}
