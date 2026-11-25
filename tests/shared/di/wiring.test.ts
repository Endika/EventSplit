import { describe, it, expect, vi } from 'vitest'

const fakeSupabase = vi.hoisted(() => ({ channel: () => ({}) }))
vi.mock('@/infrastructure/sync/SupabaseClient', () => ({ getSupabase: () => fakeSupabase }))

import { buildContainer, REPO_HANDLERS } from '@/shared/di/wiring'
import { NotifyingEventRepository } from '@/infrastructure/persistence/NotifyingEventRepository'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { RealtimeSync } from '@/infrastructure/sync/RealtimeSync'
import { OnlineDetector } from '@/infrastructure/network/OnlineDetector'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

describe('buildContainer', () => {
  it('wires the infrastructure behind the PIN-forwarding, notifying repository', () => {
    const c = buildContainer()
    expect(c.resolve('supabase')).toBe(fakeSupabase)
    expect(c.resolve('realtime')).toBeInstanceOf(RealtimeSync)
    expect(c.resolve('unlockedPin')).toBeInstanceOf(UnlockedPinHolder)
    expect(c.resolve('eventRepo')).toBeInstanceOf(NotifyingEventRepository)
    expect(c.resolve('cache')).toBeInstanceOf(LocalStorageCache)
  })

  it('starts the online detector it hands out', () => {
    const start = vi.spyOn(OnlineDetector.prototype, 'start')
    expect(buildContainer().resolve('online')).toBeInstanceOf(OnlineDetector)
    expect(start).toHaveBeenCalledOnce()
  })

  it('registers every repository-backed handler on the shared event repository', () => {
    const c = buildContainer()
    const repo = c.resolve('eventRepo')
    expect(Object.keys(REPO_HANDLERS)).toHaveLength(35)
    for (const [key, Handler] of Object.entries(REPO_HANDLERS)) {
      const handler = c.resolve(key)
      expect(handler).toBeInstanceOf(Handler)
      expect((handler as unknown as { repo: unknown }).repo).toBe(repo)
    }
  })
})
