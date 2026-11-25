import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RealtimeSync } from '@/infrastructure/sync/RealtimeSync'

type Handler = (msg: { payload?: { version?: unknown } }) => void
type StatusCallback = (status: string) => void

class FakeChannel {
  handler: Handler | null = null
  statusCallback: StatusCallback | null = null
  onArgs: unknown[] = []
  sent: unknown[] = []
  settleSend: () => void = () => {}

  constructor(
    readonly topic: string,
    readonly opts: unknown,
  ) {}

  on(type: string, filter: unknown, handler: Handler) {
    this.onArgs = [type, filter]
    this.handler = handler
    return this
  }

  subscribe(callback?: StatusCallback) {
    this.statusCallback = callback ?? null
    return this
  }

  send(message: unknown) {
    this.sent.push(message)
    return new Promise<string>((resolve) => {
      this.settleSend = () => resolve('ok')
    })
  }
}

function setup() {
  const channels: FakeChannel[] = []
  const removed: FakeChannel[] = []
  const client = {
    channel: vi.fn((topic: string, opts: unknown) => {
      const channel = new FakeChannel(topic, opts)
      channels.push(channel)
      return channel
    }),
    removeChannel: vi.fn((channel: FakeChannel) => {
      removed.push(channel)
    }),
  }
  return { sync: new RealtimeSync(client as unknown as SupabaseClient), client, channels, removed }
}

const nth = (channels: FakeChannel[], i: number) => channels[i]!

const BROADCAST_OPTS = { config: { broadcast: { self: false } } }

describe('RealtimeSync', () => {
  it('shares one non-echoing broadcast channel per event and delivers only numeric versions', () => {
    const { sync, client, channels } = setup()
    const a = vi.fn()
    const b = vi.fn()

    sync.subscribe('e1', a)
    sync.subscribe('e1', b)
    sync.subscribe('e2', vi.fn())

    expect(client.channel).toHaveBeenCalledTimes(2)
    expect(nth(channels, 0).topic).toBe('event:e1')
    expect(nth(channels, 0).opts).toEqual(BROADCAST_OPTS)
    expect(nth(channels, 0).onArgs).toEqual(['broadcast', { event: 'version' }])
    expect(nth(channels, 1).topic).toBe('event:e2')

    nth(channels, 0).handler?.({ payload: { version: 7 } })
    expect(a).toHaveBeenCalledExactlyOnceWith(7)
    expect(b).toHaveBeenCalledExactlyOnceWith(7)

    nth(channels, 0).handler?.({ payload: { version: '8' } })
    nth(channels, 0).handler?.({ payload: {} })
    nth(channels, 0).handler?.({})
    expect(a).toHaveBeenCalledTimes(1)
  })

  it('closes the channel only when its last listener leaves, and opens a fresh one afterwards', () => {
    const { sync, client, channels, removed } = setup()
    const a = vi.fn()
    const unsubscribeA = sync.subscribe('e1', a)
    const unsubscribeB = sync.subscribe('e1', vi.fn())

    unsubscribeA()
    expect(removed).toEqual([])
    nth(channels, 0).handler?.({ payload: { version: 1 } })
    expect(a).not.toHaveBeenCalled()

    unsubscribeB()
    expect(removed).toEqual([nth(channels, 0)])
    unsubscribeB()
    expect(client.removeChannel).toHaveBeenCalledTimes(1)

    sync.subscribe('e1', vi.fn())
    expect(channels).toHaveLength(2)
  })

  it('publishes only the version on the open subscription channel', () => {
    const { sync, client, channels } = setup()
    sync.subscribe('e1', vi.fn())

    sync.publish('e1', 9)

    expect(client.channel).toHaveBeenCalledTimes(1)
    expect(nth(channels, 0).sent).toEqual([
      { type: 'broadcast', event: 'version', payload: { version: 9 } },
    ])
  })

  it('publishes through a one-off channel only once subscribed, then removes it', async () => {
    const { sync, channels, removed } = setup()

    sync.publish('e1', 3)

    const channel = nth(channels, 0)
    expect(channel.topic).toBe('event:e1')
    expect(channel.opts).toEqual(BROADCAST_OPTS)
    channel.statusCallback?.('CHANNEL_ERROR')
    expect(channel.sent).toEqual([])

    channel.statusCallback?.('SUBSCRIBED')
    expect(channel.sent).toEqual([{ type: 'broadcast', event: 'version', payload: { version: 3 } }])
    expect(removed).toEqual([])

    channel.settleSend()
    await Promise.resolve()
    await Promise.resolve()
    expect(removed).toEqual([channel])
  })
})
