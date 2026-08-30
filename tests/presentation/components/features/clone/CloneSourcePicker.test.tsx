import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/presentation/i18n/config'
import { CloneSourcePicker } from '@/presentation/components/features/clone/CloneSourcePicker'
import type { CloneSource } from '@/presentation/hooks/useCloneSources'

const sources: CloneSource[] = [
  {
    id: 'aaa111a',
    name: 'Viaje anterior',
    updatedAt: '2026-06-01T00:00:00.000Z',
    participantCount: 4,
  },
  {
    id: 'bbb222b',
    name: 'Finde en Jaca',
    updatedAt: '2026-05-01T00:00:00.000Z',
    participantCount: 1,
  },
]

describe('CloneSourcePicker', () => {
  it('lists every source with its name', () => {
    render(<CloneSourcePicker sources={sources} value={null} onChange={vi.fn()} />)
    expect(screen.getByText('Viaje anterior')).toBeInTheDocument()
    expect(screen.getByText('Finde en Jaca')).toBeInTheDocument()
  })

  it('reports the chosen one and only that one', () => {
    render(<CloneSourcePicker sources={sources} value="aaa111a" onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('hands the id up when tapped', () => {
    const onChange = vi.fn()
    render(<CloneSourcePicker sources={sources} value={null} onChange={onChange} />)
    fireEvent.click(screen.getByText('Finde en Jaca'))
    expect(onChange).toHaveBeenCalledWith('bbb222b')
  })

  it('shows the participant count and the date', () => {
    render(<CloneSourcePicker sources={sources} value={null} onChange={vi.fn()} />)
    expect(screen.getByText(/4/)).toBeInTheDocument()
    expect(screen.getByText(/1 /)).toBeInTheDocument()
  })

  it('says so when there is nothing to clone from', () => {
    render(<CloneSourcePicker sources={[]} value={null} onChange={vi.fn()} />)
    expect(screen.getByText(/no tienes|you have no|ez duzu|no tens|non tes/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
