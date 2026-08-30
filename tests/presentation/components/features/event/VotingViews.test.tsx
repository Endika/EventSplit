import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@/presentation/i18n/config'
import { VotingCalendar } from '@/presentation/components/features/event/VotingCalendar'
import { OptionVoteList } from '@/presentation/components/features/event/OptionVoteList'
import type { DayOption } from '@/domain/value-objects/DayOption'

const day = (d: string, note: string | null = null): DayOption => ({ start: d, end: d, note })
const jun5to7: DayOption = { start: '2026-06-05', end: '2026-06-07', note: null }

function cell(iso: string): HTMLElement {
  const el = document.querySelector(`[data-iso="${iso}"]`)
  if (!el) throw new Error(`no cell for ${iso}`)
  return el as HTMLElement
}

describe('VotingCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-06-10T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('a tap on a day covered by one option toggles my vote there', () => {
    const onToggleMine = vi.fn()
    render(
      <VotingCalendar
        options={[jun5to7]}
        counts={[0]}
        totalVoters={3}
        myVotes={{}}
        pins={[]}
        onToggleMine={onToggleMine}
        canVote
      />,
    )
    fireEvent.click(cell('2026-06-06'))
    expect(onToggleMine).toHaveBeenCalledWith('2026-06-05..2026-06-07')
  })

  it('a tap on a day covered by two options opens a picker instead of guessing', () => {
    const onToggleMine = vi.fn()
    render(
      <VotingCalendar
        options={[jun5to7, day('2026-06-06')]}
        counts={[0, 0]}
        totalVoters={3}
        myVotes={{}}
        pins={[]}
        onToggleMine={onToggleMine}
        canVote
      />,
    )
    fireEvent.click(cell('2026-06-06'))
    expect(onToggleMine).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog')
    const options = within(dialog).getAllByRole('button')
    fireEvent.click(options[1]!)
    expect(onToggleMine).toHaveBeenCalledTimes(1)
  })

  it('shows the best option covering a day when they overlap', () => {
    render(
      <VotingCalendar
        options={[jun5to7, day('2026-06-06')]}
        counts={[1, 4]}
        totalVoters={4}
        myVotes={{}}
        pins={[]}
        onToggleMine={vi.fn()}
        canVote
      />,
    )
    expect(cell('2026-06-06')).toHaveAttribute('data-level', '4')
    expect(cell('2026-06-05')).toHaveAttribute('data-level', '1')
  })

  it('writes the vote count on the day, not only the colour', () => {
    render(
      <VotingCalendar
        options={[jun5to7]}
        counts={[2]}
        totalVoters={4}
        myVotes={{}}
        pins={[]}
        onToggleMine={vi.fn()}
        canVote
      />,
    )
    expect(within(cell('2026-06-06')).getByText('2')).toBeInTheDocument()
  })

  it('a day in no option is not a vote target', () => {
    render(
      <VotingCalendar
        options={[day('2026-06-05')]}
        counts={[0]}
        totalVoters={3}
        myVotes={{}}
        pins={[]}
        onToggleMine={vi.fn()}
        canVote
      />,
    )
    expect(cell('2026-06-09')).toHaveAttribute('data-candidate', 'false')
    expect(cell('2026-06-09').tagName).toBe('DIV')
  })

  it('marks a chosen option apart from its heat', () => {
    render(
      <VotingCalendar
        options={[day('2026-06-05')]}
        counts={[0]}
        totalVoters={4}
        myVotes={{}}
        pins={['2026-06-05..2026-06-05']}
        onToggleMine={vi.fn()}
        canVote
      />,
    )
    expect(cell('2026-06-05')).toHaveAttribute('data-level', '0')
    expect(cell('2026-06-05').className).toContain('ring-brand')
  })

  it('shows a legend for the heat scale', () => {
    render(
      <VotingCalendar
        options={[day('2026-06-05')]}
        counts={[0]}
        totalVoters={3}
        myVotes={{}}
        pins={[]}
        onToggleMine={vi.fn()}
        canVote
      />,
    )
    expect(screen.getByText(/nadie|nobody|inor|ningú|ninguén/i)).toBeInTheDocument()
    expect(screen.getByText(/todos|everyone|denak|tothom|tots/i)).toBeInTheDocument()
  })

  it('cannot vote without an identified user', () => {
    const onToggleMine = vi.fn()
    render(
      <VotingCalendar
        options={[day('2026-06-05')]}
        counts={[0]}
        totalVoters={3}
        myVotes={{}}
        pins={[]}
        onToggleMine={onToggleMine}
        canVote={false}
      />,
    )
    expect(cell('2026-06-05')).toBeDisabled()
    fireEvent.click(cell('2026-06-05'))
    expect(onToggleMine).not.toHaveBeenCalled()
  })

  it('carries an option note into the day label and title', () => {
    render(
      <VotingCalendar
        options={[{ start: '2026-06-12', end: '2026-06-14', note: 'puente' }]}
        counts={[0]}
        totalVoters={3}
        myVotes={{}}
        pins={[]}
        onToggleMine={vi.fn()}
        canVote
      />,
    )
    expect(cell('2026-06-12')).toHaveAttribute('title', 'puente')
    expect(cell('2026-06-12').getAttribute('aria-label')).toContain('puente')
  })
})

describe('OptionVoteList', () => {
  const base = {
    options: [{ start: '2026-06-12', end: '2026-06-14', note: null }],
    counts: [2],
    totalVoters: 4,
    myVotes: {},
    pins: [],
    notes: {},
    onToggleMine: vi.fn(),
    onTogglePin: vi.fn(),
    onSetNote: vi.fn(),
    canVote: true,
  }

  it('writes the vote count on every option', () => {
    render(<OptionVoteList {...base} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('/4')).toBeInTheDocument()
  })

  it('marks a chosen option', () => {
    render(<OptionVoteList {...base} pins={['2026-06-12..2026-06-14']} />)
    expect(screen.getByRole('listitem')).toHaveAttribute('data-chosen', 'true')
  })

  it('toggles my vote and the pin separately', () => {
    const onToggleMine = vi.fn()
    const onTogglePin = vi.fn()
    render(<OptionVoteList {...base} onToggleMine={onToggleMine} onTogglePin={onTogglePin} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggleMine).toHaveBeenCalledWith('2026-06-12..2026-06-14')
    fireEvent.click(screen.getByRole('button'))
    expect(onTogglePin).toHaveBeenCalledWith('2026-06-12..2026-06-14')
  })

  it('stores a note on blur, never on every keystroke', () => {
    const onSetNote = vi.fn()
    render(<OptionVoteList {...base} onSetNote={onSetNote} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'casa rural 120 €' } })
    expect(onSetNote).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onSetNote).toHaveBeenCalledWith('2026-06-12..2026-06-14', 'casa rural 120 €')
  })

  it('caps the note at 80 characters', () => {
    render(<OptionVoteList {...base} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '80')
  })

  it('clearing a note stores null, not an empty string', () => {
    const onSetNote = vi.fn()
    render(
      <OptionVoteList
        {...base}
        options={[{ start: '2026-06-12', end: '2026-06-14', note: 'algo' }]}
        onSetNote={onSetNote}
      />,
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)
    expect(onSetNote).toHaveBeenCalledWith('2026-06-12..2026-06-14', null)
  })

  it('cannot vote without an identified user', () => {
    render(<OptionVoteList {...base} canVote={false} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})
