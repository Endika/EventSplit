import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/presentation/i18n/config'
import { DayOptionsCalendar } from '@/presentation/components/features/event/DayOptionsCalendar'
import type { DayOption } from '@/domain/value-objects/DayOption'

const day = (d: string, note: string | null = null): DayOption => ({ start: d, end: d, note })

/** Day cells are queried by their ISO date: the visible label depends on locale. */
function cell(iso: string): HTMLElement {
  const el = document.querySelector(`[data-iso="${iso}"]`)
  if (!el) throw new Error(`no cell for ${iso}`)
  return el as HTMLElement
}

describe('DayOptionsCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-06-10T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('a tap adds a single-day option and another tap removes it', () => {
    const onCommit = vi.fn()
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={onCommit} busy={false} />)

    fireEvent.click(cell('2026-06-05'))
    expect(cell('2026-06-05')).toHaveAttribute('data-picked', 'true')

    fireEvent.click(screen.getByRole('button', { name: /guardar|save|gorde|desa/i }))
    expect(onCommit).toHaveBeenCalledWith([day('2026-06-05')])

    fireEvent.click(cell('2026-06-05'))
    expect(cell('2026-06-05')).toHaveAttribute('data-picked', 'false')
  })

  it('range mode turns two taps into one option', () => {
    const onCommit = vi.fn()
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={onCommit} busy={false} />)

    fireEvent.click(screen.getByRole('button', { name: /tramo|stretch|tarte|tram/i }))
    fireEvent.click(cell('2026-06-12'))
    fireEvent.click(cell('2026-06-14'))

    fireEvent.click(screen.getByRole('button', { name: /guardar|save|gorde|desa/i }))
    expect(onCommit).toHaveBeenCalledWith([{ start: '2026-06-12', end: '2026-06-14', note: null }])
  })

  it('range mode accepts the two taps in reverse order', () => {
    const onCommit = vi.fn()
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={onCommit} busy={false} />)

    fireEvent.click(screen.getByRole('button', { name: /tramo|stretch|tarte|tram/i }))
    fireEvent.click(cell('2026-06-14'))
    fireEvent.click(cell('2026-06-12'))

    fireEvent.click(screen.getByRole('button', { name: /guardar|save|gorde|desa/i }))
    expect(onCommit).toHaveBeenCalledWith([{ start: '2026-06-12', end: '2026-06-14', note: null }])
  })

  it('range mode switches itself off once the stretch is made', () => {
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={vi.fn()} busy={false} />)
    const toggle = screen.getByRole('button', { name: /tramo|stretch|tarte|tram/i })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(cell('2026-06-12'))
    fireEvent.click(cell('2026-06-14'))
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks before dropping an option that already has votes', () => {
    const onCommit = vi.fn()
    render(
      <DayOptionsCalendar
        options={[day('2026-06-05')]}
        votesByKey={{ '2026-06-05..2026-06-05': 2 }}
        onCommit={onCommit}
        busy={false}
      />,
    )
    fireEvent.click(cell('2026-06-05'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(cell('2026-06-05')).toHaveAttribute('data-picked', 'true')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('drops a voted option once the confirmation is accepted', () => {
    render(
      <DayOptionsCalendar
        options={[day('2026-06-05'), day('2026-06-06')]}
        votesByKey={{ '2026-06-05..2026-06-05': 2 }}
        onCommit={vi.fn()}
        busy={false}
      />,
    )
    fireEvent.click(cell('2026-06-05'))
    fireEvent.click(screen.getByRole('button', { name: /^(quitar|remove|kendu|treure|llevar)$/i }))
    expect(cell('2026-06-05')).toHaveAttribute('data-picked', 'false')
  })

  it('asks which option to drop when a day belongs to two', () => {
    render(
      <DayOptionsCalendar
        options={[{ start: '2026-06-05', end: '2026-06-07', note: null }, day('2026-06-06')]}
        votesByKey={{}}
        onCommit={vi.fn()}
        busy={false}
      />,
    )
    fireEvent.click(cell('2026-06-06'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(cell('2026-06-06')).toHaveAttribute('data-picked', 'true')
  })

  it('refuses to go past 31 options', () => {
    const options = Array.from({ length: 31 }, (_, i) =>
      day(`2026-06-${`${i + 1}`.padStart(2, '0')}`),
    )
    render(<DayOptionsCalendar options={options} votesByKey={{}} onCommit={vi.fn()} busy={false} />)
    expect(cell('2026-07-01')).toBeDisabled()
  })

  it('refuses a stretch longer than 31 days', () => {
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={vi.fn()} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: /tramo|stretch|tarte|tram/i }))
    fireEvent.click(cell('2026-06-01'))
    fireEvent.click(screen.getByRole('button', { name: /siguiente|next|hurrengo|següent/i }))
    fireEvent.click(cell('2026-07-02'))
    expect(screen.getByText(/31 d(í|i)as|31 days|31 egun|31 dies/i)).toBeInTheDocument()
    expect(cell('2026-07-02')).toHaveAttribute('data-picked', 'false')
  })

  it('cannot save an empty selection', () => {
    render(
      <DayOptionsCalendar
        options={[day('2026-06-05')]}
        votesByKey={{}}
        onCommit={vi.fn()}
        busy={false}
      />,
    )
    fireEvent.click(cell('2026-06-05'))
    expect(screen.getByRole('button', { name: /guardar|save|gorde|desa/i })).toBeDisabled()
  })

  it('cannot save when nothing changed', () => {
    render(
      <DayOptionsCalendar
        options={[day('2026-06-05')]}
        votesByKey={{}}
        onCommit={vi.fn()}
        busy={false}
      />,
    )
    expect(screen.getByRole('button', { name: /guardar|save|gorde|desa/i })).toBeDisabled()
  })

  it('keeps non-consecutive days as separate options', () => {
    const onCommit = vi.fn()
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={onCommit} busy={false} />)
    fireEvent.click(cell('2026-06-05'))
    fireEvent.click(cell('2026-06-20'))
    fireEvent.click(screen.getByRole('button', { name: /guardar|save|gorde|desa/i }))
    expect(onCommit).toHaveBeenCalledWith([day('2026-06-05'), day('2026-06-20')])
  })

  it('draws a selected stretch as one band, not as separate days', () => {
    render(
      <DayOptionsCalendar
        options={[{ start: '2026-06-12', end: '2026-06-14', note: null }]}
        votesByKey={{}}
        onCommit={vi.fn()}
        busy={false}
      />,
    )
    expect(cell('2026-06-12')).toHaveAttribute('data-span', 'start')
    expect(cell('2026-06-13')).toHaveAttribute('data-span', 'middle')
    expect(cell('2026-06-14')).toHaveAttribute('data-span', 'end')
  })

  it('a single day is its own rounded cell', () => {
    render(
      <DayOptionsCalendar
        options={[day('2026-06-05')]}
        votesByKey={{}}
        onCommit={vi.fn()}
        busy={false}
      />,
    )
    expect(cell('2026-06-05')).toHaveAttribute('data-span', 'single')
  })

  it('a day picked into a stretch reads as a band right away', () => {
    render(<DayOptionsCalendar options={[]} votesByKey={{}} onCommit={vi.fn()} busy={false} />)
    fireEvent.click(screen.getByRole('button', { name: /tramo|stretch|tarte|tram/i }))
    fireEvent.click(cell('2026-06-12'))
    fireEvent.click(cell('2026-06-14'))
    expect(cell('2026-06-12')).toHaveAttribute('data-span', 'start')
    expect(cell('2026-06-13')).toHaveAttribute('data-span', 'middle')
    expect(cell('2026-06-14')).toHaveAttribute('data-span', 'end')
  })
})
