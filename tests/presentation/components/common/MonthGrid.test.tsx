import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthGrid } from '@/presentation/components/common/MonthGrid'
import { monthDays, monthOf, shiftMonth } from '@/presentation/utils/calendarMonth'

describe('monthDays', () => {
  it('lays out June 2026 starting on Monday with 6 weeks of cells', () => {
    const days = monthDays('2026-06')
    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-06-01') // 1 June 2026 is a Monday
  })

  it('pads a month that does not start on Monday with the previous days', () => {
    // 1 July 2026 is a Wednesday, so two June cells come first
    expect(monthDays('2026-07').slice(0, 3)).toEqual(['2026-06-29', '2026-06-30', '2026-07-01'])
  })

  it('stays on 42 consecutive days across a DST change', () => {
    const days = monthDays('2026-03')
    expect(days).toHaveLength(42)
    expect(new Set(days).size).toBe(42)
    expect(days).toContain('2026-03-29')
  })
})

describe('shiftMonth and monthOf', () => {
  it('shifts across a year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('reads the month of an ISO day', () => {
    expect(monthOf('2026-06-05')).toBe('2026-06')
  })
})

describe('MonthGrid', () => {
  it('renders weekday headers and calls renderDay for every cell', () => {
    const renderDay = vi.fn((iso: string) => <span>{iso.slice(-2)}</span>)
    render(<MonthGrid month="2026-06" locale="es" onMonthChange={() => {}} renderDay={renderDay} />)
    expect(renderDay).toHaveBeenCalledTimes(42)
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
  })

  it('moves month with the arrows', () => {
    const onMonthChange = vi.fn()
    render(
      <MonthGrid
        month="2026-06"
        locale="es"
        onMonthChange={onMonthChange}
        renderDay={() => null}
        labels={{ prev: 'Mes anterior', next: 'Mes siguiente' }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(onMonthChange).toHaveBeenCalledWith('2026-07')
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(onMonthChange).toHaveBeenCalledWith('2026-05')
  })

  it('names the month it is showing', () => {
    render(
      <MonthGrid month="2026-06" locale="es" onMonthChange={() => {}} renderDay={() => null} />,
    )
    expect(screen.getByText(/junio/i)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })
})
