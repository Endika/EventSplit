import { describe, it, expect } from 'vitest'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('Event', () => {
  it('rejects event name shorter than 3 chars', () => {
    const creator = User.create({ name: 'John' })
    expect(() => Event.create({ name: 'AB', creator })).toThrow(/name/)
  })

  it('rejects event name longer than 100 chars', () => {
    const creator = User.create({ name: 'John' })
    expect(() => Event.create({ name: 'a'.repeat(101), creator })).toThrow(/name/)
  })

  it('puts creator into users[] and seeds history', () => {
    const creator = User.create({ name: 'John', alias: 'cousin' })
    const e = Event.create({ name: 'Trip', creator })
    const snap = e.toSnapshot()
    expect(snap.users).toHaveLength(1)
    expect(snap.users[0]!.name).toBe('John')
    expect(snap.createdBy).toBe(creator.id.value)
    expect(snap.history).toHaveLength(1)
    expect(snap.history[0]!.type).toBe('event_created')
  })

  it('round-trips through toSnapshot / restore', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const restored = Event.restore(e.toSnapshot())
    expect(restored.toSnapshot()).toEqual(e.toSnapshot())
  })

  it('addUser appends to users[] and history', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    const next = e.addUser(maria)
    expect(next.toSnapshot().users.map((u) => u.name)).toEqual(['John', 'Maria'])
    expect(next.toSnapshot().history.at(-1)?.type).toBe('user_joined')
  })

  it('rejects duplicate user id', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() => e.addUser(creator)).toThrow(/already/)
  })
})
