import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthGrid } from '@/presentation/components/common/MonthGrid'

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
