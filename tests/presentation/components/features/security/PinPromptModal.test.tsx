import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { PinPromptModal } from '@/presentation/components/features/security/PinPromptModal'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { PIN_KEY } from '@/shared/di/UnlockedPinHolder'
import { makeEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const EVENT_ID = 'abc123x'

function Writer({ run, onError }: { run: () => unknown; onError?: (e: unknown) => void }) {
  const { guardedExecute } = useWriteGuard()
  return <button onClick={() => guardedExecute(run, onError)}>write</button>
}

async function lockedApp(run: () => unknown, onError?: (e: unknown) => void) {
  const app = await renderWithEvent(
    <>
      <Writer run={run} onError={onError} />
      <PinPromptModal />
    </>,
    makeEvent({ hasPin: true, users: [makeUser(ME)] }),
    ME,
  )
  await app.repo.setPin(EVENT_ID, '1234', null)
  fireEvent.click(screen.getByRole('button', { name: 'write' }))
  return app
}

const field = () => screen.findByPlaceholderText('PIN')
const type = async (value: string) => fireEvent.change(await field(), { target: { value } })
const unlock = () => screen.getByRole('button', { name: 'Unlock' })

describe('PinPromptModal', () => {
  beforeEach(() => localStorage.clear())

  it('holds the write back, keeps only digits and wants at least four of them', async () => {
    const run = vi.fn()
    await lockedApp(run)
    await type('1a2b3')
    expect(await field()).toHaveValue('123')
    expect(unlock()).toBeDisabled()
    await type('1234')
    expect(unlock()).toBeEnabled()
    expect(run).not.toHaveBeenCalled()
  })

  it('does not run the write nor remember anything after a wrong PIN', async () => {
    const run = vi.fn()
    await lockedApp(run)
    await type('9999')
    fireEvent.click(unlock())
    expect(await screen.findByText('Wrong PIN, try again')).toBeInTheDocument()
    expect(await field()).toHaveValue('')
    expect(run).not.toHaveBeenCalled()
    expect(localStorage.getItem(PIN_KEY(EVENT_ID))).toBeNull()
  })

  it('remembers the right PIN, runs the held write once and stops asking', async () => {
    const run = vi.fn()
    await lockedApp(run)
    await type('1234')
    fireEvent.click(unlock())
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(PIN_KEY(EVENT_ID))).toBe('1234')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'write' }))
    expect(run).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hands a failing held write to its own error handler', async () => {
    const onError = vi.fn()
    const boom = new Error('boom')
    await lockedApp(() => {
      throw boom
    }, onError)
    await type('1234')
    fireEvent.click(unlock())
    await waitFor(() => expect(onError).toHaveBeenCalledWith(boom))
  })

  it('drops the held write when cancelled', async () => {
    const run = vi.fn()
    await lockedApp(run)
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(run).not.toHaveBeenCalled()
    expect(localStorage.getItem(PIN_KEY(EVENT_ID))).toBeNull()
  })

  it('says to wait, and runs nothing, while wrong guesses have the event throttled', async () => {
    const run = vi.fn()
    const app = await lockedApp(run)
    for (let i = 0; i < 10; i++) await app.repo.verifyPin(EVENT_ID, '0000')
    await type('1234')
    fireEvent.click(unlock())
    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
    expect(run).not.toHaveBeenCalled()
    expect(localStorage.getItem(PIN_KEY(EVENT_ID))).toBeNull()
  })
})
