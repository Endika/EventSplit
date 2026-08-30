import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAvailabilityDraft } from '@/presentation/hooks/useAvailabilityDraft'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { DayOption } from '@/domain/value-objects/DayOption'

function snapshot(over: {
  dayOptions?: DayOption[]
  availability?: Record<string, boolean[]>
  chosenOptions?: string[]
}): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'u1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [],
    availability: over.availability ?? {},
    availabilityNote: null,
    chosenOptions: over.chosenOptions ?? [],
    dayOptions: over.dayOptions ?? [],
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
  }
}

const jun5: DayOption = { start: '2026-06-05', end: '2026-06-05', note: null }
const jun12: DayOption = { start: '2026-06-12', end: '2026-06-14', note: null }
const KEY5 = '2026-06-05..2026-06-05'
const KEY12 = '2026-06-12..2026-06-14'

describe('useAvailabilityDraft', () => {
  it('reads saved votes by option key', () => {
    const event = snapshot({ dayOptions: [jun5, jun12], availability: { u1: [true, false] } })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    expect(result.current.voteOf('u1', KEY5)).toBe(true)
    expect(result.current.voteOf('u1', KEY12)).toBe(false)
    expect(result.current.rowFor('u1')).toEqual([true, false])
    expect(result.current.dirty).toBe(false)
  })

  it('keeps an unsaved vote when a new option arrives from realtime', () => {
    const { result, rerender } = renderHook((e: EventSnapshot) => useAvailabilityDraft(e), {
      initialProps: snapshot({ dayOptions: [jun5], availability: { u1: [false] } }),
    })
    act(() => result.current.setVote('u1', KEY5, true))

    rerender(
      snapshot({
        dayOptions: [{ start: '2026-06-01', end: '2026-06-01', note: null }, jun5],
        availability: { u1: [false, false] },
      }),
    )

    expect(result.current.voteOf('u1', KEY5)).toBe(true)
    expect(result.current.rowFor('u1')).toEqual([false, true])
  })

  it('counts votes for an option from the live draft', () => {
    const event = snapshot({ dayOptions: [jun5] })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    act(() => result.current.setVote('u1', KEY5, true))
    expect(result.current.votesFor(KEY5, ['u1', 'u2'])).toBe(1)
  })

  it('builds a full matrix that covers every option', () => {
    const event = snapshot({ dayOptions: [jun5, jun12], availability: { u1: [true, true] } })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    act(() => result.current.setVote('u1', KEY5, false))
    expect(result.current.matrix(['u1'])).toEqual({ u1: [false, true] })
  })

  it('pins live in the draft and start from what is saved', () => {
    const event = snapshot({ dayOptions: [jun5, jun12], chosenOptions: [KEY5] })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    expect(result.current.pins).toEqual([KEY5])
    expect(result.current.dirty).toBe(false)

    act(() => result.current.togglePin(KEY12))
    expect(result.current.pins).toEqual([KEY5, KEY12])
    expect(result.current.dirty).toBe(true)

    act(() => result.current.togglePin(KEY5))
    expect(result.current.pins).toEqual([KEY12])
  })

  it('notes live in the draft and fall back to the saved note', () => {
    const event = snapshot({
      dayOptions: [{ start: '2026-06-12', end: '2026-06-14', note: 'casa rural' }],
    })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    expect(result.current.noteOf(KEY12)).toBe('casa rural')

    act(() => result.current.setNote(KEY12, 'puente de la Almudena'))
    expect(result.current.noteOf(KEY12)).toBe('puente de la Almudena')
    expect(result.current.dirty).toBe(true)

    act(() => result.current.setNote(KEY12, null))
    expect(result.current.noteOf(KEY12)).toBeNull()
  })

  it('optionsWithNotes merges draft notes into the options to save', () => {
    const event = snapshot({ dayOptions: [jun5, jun12] })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    act(() => result.current.setNote(KEY5, '  hay partido  '))
    expect(result.current.optionsWithNotes()).toEqual([
      { start: '2026-06-05', end: '2026-06-05', note: 'hay partido' },
      jun12,
    ])
  })

  it('reset drops everything unsaved', () => {
    const event = snapshot({ dayOptions: [jun5], availability: { u1: [false] } })
    const { result } = renderHook(() => useAvailabilityDraft(event))
    act(() => {
      result.current.setVote('u1', KEY5, true)
      result.current.togglePin(KEY5)
      result.current.setNote(KEY5, 'x')
    })
    expect(result.current.dirty).toBe(true)

    act(() => result.current.reset())
    expect(result.current.dirty).toBe(false)
    expect(result.current.voteOf('u1', KEY5)).toBe(false)
    expect(result.current.pins).toEqual([])
    expect(result.current.noteOf(KEY5)).toBeNull()
  })

  it('survives a null event', () => {
    const { result } = renderHook(() => useAvailabilityDraft(null))
    expect(result.current.rowFor('u1')).toEqual([])
    expect(result.current.pins).toEqual([])
    expect(result.current.dirty).toBe(false)
  })
})
