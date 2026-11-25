import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@/presentation/i18n/config'
import { ShareButton } from '@/presentation/components/common/ShareButton'

const click = () => fireEvent.click(screen.getByRole('button', { name: 'Share' }))

function stubNavigator(nav: { share?: unknown; clipboard?: unknown }) {
  vi.stubGlobal('navigator', nav)
}

describe('ShareButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('copies the link when the browser cannot share, says so, and stops saying so after a while', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ clipboard: { writeText } })
    render(<ShareButton eventName="Trip" />)
    await act(async () => click())
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('hands the event name and link to the native share sheet, without any notice', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share })
    render(<ShareButton eventName="Trip" />)
    await act(async () => click())
    expect(share).toHaveBeenCalledWith({ title: 'Trip', url: window.location.href })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stays quiet when the person cancels but tells them when sharing fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const share = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
      .mockRejectedValueOnce(new Error('boom'))
    stubNavigator({ share })
    render(<ShareButton eventName="" />)
    await act(async () => click())
    expect(screen.queryByRole('status')).toBeNull()
    await act(async () => click())
    expect(screen.getByRole('status')).toHaveTextContent("Your browser doesn't support sharing")
    expect(share).toHaveBeenLastCalledWith({ title: 'Share event', url: window.location.href })
  })
})
