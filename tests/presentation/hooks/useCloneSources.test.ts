import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCloneSources } from '@/presentation/hooks/useCloneSources'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { EventSnapshot } from '@/domain/entities/Event'

function snapshot(id: string, over: Partial<EventSnapshot> = {}): EventSnapshot {
  return {
    id,
    name: `Event ${id}`,
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [
      {
        id: 'u1',
        name: 'Iker',
        alias: null,
        kind: 'adult',
        joinedAt: '2026-01-01T00:00:00.000Z',
        email: null,
        phone: null,
        allergies: [],
        dietary: null,
        notes: null,
      },
    ],
    availability: {},
    availabilityNote: null,
    chosenOptions: [],
    dayOptions: [],
    purchases: [],
    groupOrder: [],
    subgroupOrder: {},
    expenses: [],
    hasPin: false,
    stage: 'doodle',
    settledTransfers: [],
    manualLiquidations: [],
    history: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function cacheEvent(id: string, over: Partial<EventSnapshot> = {}, withIdentity = true) {
  const cache = new LocalStorageCache()
  cache.set(id, { snapshot: snapshot(id, over), version: 1 })
  if (withIdentity) cache.setIdentity(id, { id: 'u1', name: 'Iker', alias: null })
}

describe('useCloneSources', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('lists cached events where I have an identity, newest first', () => {
    cacheEvent('aaa111a', { updatedAt: '2026-05-01T00:00:00.000Z' })
    cacheEvent('bbb222b', { updatedAt: '2026-06-01T00:00:00.000Z' })
    const { result } = renderHook(() => useCloneSources('target1'))
    expect(result.current.map((s) => s.id)).toEqual(['bbb222b', 'aaa111a'])
  })

  it('excludes an event where I am not a participant', () => {
    cacheEvent('aaa111a', {}, false)
    const { result } = renderHook(() => useCloneSources('target1'))
    expect(result.current).toEqual([])
  })

  it('excludes the event being cloned into', () => {
    cacheEvent('target1')
    cacheEvent('aaa111a')
    const { result } = renderHook(() => useCloneSources('target1'))
    expect(result.current.map((s) => s.id)).toEqual(['aaa111a'])
  })

  it('excludes PIN-protected events', () => {
    cacheEvent('aaa111a', { hasPin: true })
    cacheEvent('bbb222b')
    const { result } = renderHook(() => useCloneSources('target1'))
    expect(result.current.map((s) => s.id)).toEqual(['bbb222b'])
  })

  it('reports the name and participant count', () => {
    cacheEvent('aaa111a', { name: 'Viaje anterior' })
    const { result } = renderHook(() => useCloneSources('target1'))
    expect(result.current[0]).toMatchObject({ name: 'Viaje anterior', participantCount: 1 })
  })

  it('survives a localStorage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('nope')
    })
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('nope')
    })
    const { result } = renderHook(() => useCloneSources('target1'))
    expect(result.current).toEqual([])
  })
})
