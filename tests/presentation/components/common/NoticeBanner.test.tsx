import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@/presentation/i18n/config'
import { NoticeBanner } from '@/presentation/components/common/NoticeBanner'
import { notify } from '@/shared/utils/notify'

describe('NoticeBanner', () => {
  afterEach(() => vi.useRealTimers())

  it('shows a notice in the page language and clears it after four seconds', () => {
    vi.useFakeTimers()
    render(<NoticeBanner />)
    expect(screen.queryByRole('status')).toBeNull()

    act(() => notify('sync.rateLimited'))
    expect(screen.getByRole('status')).toHaveTextContent('Too many changes too fast')

    act(() => void vi.advanceTimersByTime(3999))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(1))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
