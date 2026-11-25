import { describe, it, expect } from 'vitest'
import {
  matrixVoters,
  notesChanged,
  optionOfKey,
  pinsChanged,
  removableKeys,
  savedVotesByKey,
} from '@/presentation/utils/availabilityVotes'
import { makeUser } from '../../support/eventFixtures'

const day = (d: string, note: string | null = null) => ({ start: d, end: d, note })
const a = day('2026-06-01')
const b = day('2026-06-02', 'puente')
const users = [
  makeUser('ada'),
  makeUser('kid', { kind: 'child' }),
  makeUser('rex', { kind: 'dog' }),
]

describe('availabilityVotes', () => {
  it('shows adults, plus children but never dogs when asked', () => {
    expect(matrixVoters(users, false).map((u) => u.id)).toEqual(['ada'])
    expect(matrixVoters(users, true).map((u) => u.id)).toEqual(['ada', 'kid'])
  })

  it('counts saved votes of people only, option by option', () => {
    const availability = {
      ada: [true, false],
      kid: [true, true],
      rex: [true, true],
      gone: [true, true],
    }
    expect(savedVotesByKey({ dayOptions: [a, b], users, availability })).toEqual({
      '2026-06-01..2026-06-01': 2,
      '2026-06-02..2026-06-02': 1,
    })
  })

  it('can remove only what nobody voted for', () => {
    expect(
      removableKeys([a, b], { '2026-06-01..2026-06-01': 0, '2026-06-02..2026-06-02': 1 }),
    ).toEqual(['2026-06-01..2026-06-01'])
  })

  it.each([
    [['x'], ['x'], false],
    [['x'], ['x', 'y'], true],
    [['x', 'z'], ['x', 'y'], true],
  ])('pins %j against saved %j: changed is %s', (pins, chosen, expected) => {
    expect(pinsChanged(pins, chosen)).toBe(expected)
  })

  it('notices a note the draft changed', () => {
    expect(notesChanged([a, b], (key) => (key.startsWith('2026-06-02') ? 'puente' : null))).toBe(
      false,
    )
    expect(notesChanged([a, b], (key) => (key.startsWith('2026-06-02') ? 'other' : null))).toBe(
      true,
    )
    expect(notesChanged([a], () => 'new')).toBe(true)
  })

  it('finds the option for a key, or stands in a single day when it is gone', () => {
    expect(optionOfKey([a, b], '2026-06-02..2026-06-02')).toBe(b)
    expect(optionOfKey([a], '2026-09-09..2026-09-12')).toEqual({
      start: '2026-09-09',
      end: '2026-09-09',
      note: null,
    })
  })
})
