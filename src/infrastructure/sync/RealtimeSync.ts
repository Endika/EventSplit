import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { EventSnapshot } from '@/domain/entities/Event'

export interface RealtimePayload {
  snapshot: EventSnapshot
  version: number
}

type Listener = (payload: RealtimePayload) => void

export class RealtimeSync {
  private channels = new Map<string, { channel: RealtimeChannel; listeners: Set<Listener> }>()

  constructor(private readonly client: SupabaseClient) {}

  subscribe(eventId: string, listener: Listener): () => void {
    let entry = this.channels.get(eventId)
    if (!entry) {
      const channel = this.client
        .channel(`event:${eventId}`)
        .on<{ data: EventSnapshot; version: number }>(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
          (payload) => {
            const row = payload.new
            const event: RealtimePayload = { snapshot: row.data, version: row.version }
            this.channels.get(eventId)?.listeners.forEach((l) => l(event))
          },
        )
        .subscribe()
      entry = { channel, listeners: new Set() }
      this.channels.set(eventId, entry)
    }
    entry.listeners.add(listener)
    return () => this.unsubscribe(eventId, listener)
  }

  private unsubscribe(eventId: string, listener: Listener): void {
    const entry = this.channels.get(eventId)
    if (!entry) return
    entry.listeners.delete(listener)
    if (entry.listeners.size === 0) {
      void this.client.removeChannel(entry.channel)
      this.channels.delete(eventId)
    }
  }
}
