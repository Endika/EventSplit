import { describe, it, expect } from 'vitest'
import type { EventSnapshot } from '@/domain/entities/Event'
import { creatorIdentity, newEventInput, withPinSet } from '@/presentation/utils/homeForm'

describe('home form', () => {
  it.each([['', null]])('creates the event with alias "%s" as %s', (alias, creatorAlias) => {
    expect(newEventInput('Trip', 'Ana', alias)).toStrictEqual({
      name: 'Trip',
      creatorName: 'Ana',
      creatorAlias,
    })
  })

  it.each([['  ', null]])('remembers the creator with alias "%s" as %s', (alias, expected) => {
    expect(creatorIdentity('u1', ' Ana ', alias)).toStrictEqual({
      id: 'u1',
      name: 'Ana',
      alias: expected,
    })
  })

  it('caches the event as PIN-protected at the version the server bumped to', () => {
    const event = { id: 'e1', hasPin: false } as EventSnapshot
    expect(withPinSet(event, 3)).toStrictEqual({
      snapshot: { id: 'e1', hasPin: true },
      version: 4,
    })
  })
})
