import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@/presentation/i18n/config'
import { ErrorBanner } from '@/presentation/components/common/ErrorBanner'
import { reportError } from '@/shared/utils/reportError'

describe('ErrorBanner', () => {
  it('shows a reported error, copies it whole, and goes away when dismissed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<ErrorBanner />)
    expect(screen.queryByRole('alert')).toBeNull()

    act(() => reportError('Home', new TypeError('boom')))
    expect(screen.getByRole('alert')).toHaveTextContent('TypeError: boom')

    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Copy error' })))
    expect(writeText).toHaveBeenCalledWith('[Home] TypeError: boom')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).toBeNull()
    vi.unstubAllGlobals()
  })
})
