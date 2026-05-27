import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'

type Listener = (version: number) => void

const topic = (eventId: string) => `event:${eventId}`
const BROADCAST_EVENT = 'version'

/**
 * Supabase Realtime adapter for {@link IEventChangeNotifier}. It uses broadcast
 * (not postgres_changes), so a change pushes a few bytes — the version number —
 * to every client instead of the whole row. Subscribers fetch the snapshot only
 * if the new version is worth it. Delivery is best-effort; the version-gated
 * refetch on focus/reconnect is the safety net.
 */
export class RealtimeSync implements IEventChangeNotifier {
  private channels = new Map<string, { channel: RealtimeChannel; listeners: Set<Listener> }>()

  constructor(private readonly client: SupabaseClient) {}

  subscribe(eventId: string, onVersion: Listener): () => void {
    let entry = this.channels.get(eventId)
    if (!entry) {
      const listeners = new Set<Listener>()
      const channel = this.client
        .channel(topic(eventId), { config: { broadcast: { self: false } } })
        .on<{ version: number }>('broadcast', { event: BROADCAST_EVENT }, (msg) => {
          const version = msg.payload?.version
          if (typeof version === 'number') listeners.forEach((l) => l(version))
        })
        .subscribe()
      entry = { channel, listeners }
      this.channels.set(eventId, entry)
    }
    entry.listeners.add(onVersion)
    return () => this.unsubscribe(eventId, onVersion)
  }

  publish(eventId: string, version: number): void {
    const existing = this.channels.get(eventId)
    if (existing) {
      void existing.channel.send({ type: 'broadcast', event: BROADCAST_EVENT, payload: { version } })
      return
    }
    // No open subscription on this client (rare): fire a one-off channel.
    const channel = this.client.channel(topic(eventId), { config: { broadcast: { self: false } } })
    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      void channel
        .send({ type: 'broadcast', event: BROADCAST_EVENT, payload: { version } })
        .finally(() => void this.client.removeChannel(channel))
    })
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
