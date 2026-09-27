import type { EventSnapshot } from '@/domain/entities/Event'
import { parseEventSnapshot } from '@/infrastructure/persistence/EventSnapshotSchema'
import { PIN_KEY } from '@/shared/di/UnlockedPinHolder'

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
      const json = JSON.parse(raw) as { snapshot: unknown; version: number }
      const snapshot = parseEventSnapshot(json.snapshot)
      return { snapshot, version: json.version }
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
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('eventsplit.event.')) keys.push(key)
    }
    for (const key of keys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const json = JSON.parse(raw) as { snapshot: unknown; version: number }
        const cached = { snapshot: parseEventSnapshot(json.snapshot), version: json.version }
        // Memory-era copy of a now PIN-protected event this device holds no PIN for:
        // drop it instead of leaking its name on Home.
        if (cached.snapshot.hasPin && localStorage.getItem(PIN_KEY(cached.snapshot.id)) === null) {
          localStorage.removeItem(key)
          continue
        }
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

  removeIdentity(eventId: string): void {
    localStorage.removeItem(IDENT_KEY(eventId))
  }

  /** Drop only the cached event data, keeping who this device is in it. */
  removeSnapshot(eventId: string): void {
    localStorage.removeItem(EVENT_KEY(eventId))
  }

  /** Forget the event entirely on this device, its remembered PIN included. */
  remove(eventId: string): void {
    localStorage.removeItem(EVENT_KEY(eventId))
    localStorage.removeItem(IDENT_KEY(eventId))
    localStorage.removeItem(PIN_KEY(eventId))
  }
}
