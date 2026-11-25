import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/presentation/i18n/config'
import { RecentEventsList } from '@/presentation/components/features/home/RecentEventsList'

const items = [
  {
    id: 'abc123x',
    name: 'Trip',
    updatedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    participantCount: 3,
    version: 1,
  },
]

describe('RecentEventsList', () => {
  it('shows nothing without events', () => {
    const { container } = render(<RecentEventsList items={[]} onForget={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists each event with its activity, opens it and forgets it on request', () => {
    const onForget = vi.fn()
    const push = vi.spyOn(window.history, 'pushState')
    const popped = vi.fn()
    window.addEventListener('popstate', popped)
    render(<RecentEventsList items={items} onForget={onForget} />)
    expect(screen.getByText(/Last activity 5m ago · 3 participants/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Trip'))
    expect(push).toHaveBeenCalledWith({}, '', expect.stringContaining('?event=abc123x'))
    expect(popped).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from this device' }))
    expect(onForget).toHaveBeenCalledWith('abc123x')
    window.removeEventListener('popstate', popped)
  })
})
