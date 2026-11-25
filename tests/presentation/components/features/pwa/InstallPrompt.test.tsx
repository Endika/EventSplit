import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@/presentation/i18n/config'
import { InstallPrompt } from '@/presentation/components/features/pwa/InstallPrompt'

function stubDevice(opts: { standalone?: boolean; userAgent?: string }) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: opts.standalone ?? false }))
  if (opts.userAgent) vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(opts.userAgent)
}

describe('InstallPrompt', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('offers the native install once the browser allows it, and stays gone after dismissal', () => {
    stubDevice({})
    const view = render(<InstallPrompt />)
    expect(screen.queryByRole('region')).toBeNull()

    const prompt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    act(() => void window.dispatchEvent(prompt))
    expect(prompt.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('region')).toBeNull()
    view.unmount()
    render(<InstallPrompt />)
    act(() => void window.dispatchEvent(prompt))
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('tells iPhone users how to install by hand, unless the app is already installed', () => {
    stubDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    const view = render(<InstallPrompt />)
    expect(screen.getByRole('region')).toHaveTextContent('Add to Home Screen')
    view.unmount()

    stubDevice({ standalone: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    render(<InstallPrompt />)
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('runs the native prompt on Install and does not ask again', async () => {
    stubDevice({})
    render(<InstallPrompt />)
    const prompt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    })
    act(() => void window.dispatchEvent(prompt))
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Install' })))
    expect(prompt.prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('region')).toBeNull()
    expect(localStorage.getItem('eventsplit.installDismissed')).toBe('true')
  })
})
