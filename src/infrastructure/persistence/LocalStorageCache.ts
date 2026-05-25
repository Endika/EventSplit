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
}
