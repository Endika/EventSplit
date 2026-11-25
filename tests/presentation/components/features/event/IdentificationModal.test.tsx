import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@/presentation/i18n/config'
import { IdentificationModal } from '@/presentation/components/features/identification/IdentificationModal'
import { makeUser } from '../../../../support/eventFixtures'

const users = [makeUser('u1', { name: 'Ane', alias: 'Anita' }), makeUser('u2', { name: 'Iker' })]

const open = (onConfirm = vi.fn().mockResolvedValue(undefined)) => {
  render(<IdentificationModal eventName="Trip" users={users} onConfirm={onConfirm} />)
  return onConfirm
}

const startNew = (name: string, alias = '') => {
  fireEvent.click(screen.getByRole('button', { name: /i'm new/i }))
  fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: name } })
  fireEvent.change(screen.getByPlaceholderText('Nickname (optional)'), {
    target: { value: alias },
  })
}

describe('IdentificationModal', () => {
  it('asks for a nickname when the name is already taken, whatever its case', () => {
    const onConfirm = open()
    startNew(' iker ')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(screen.getByText(/already a "iker"/i)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('Nickname (optional)'), {
      target: { value: 'Ike' },
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledWith({
      kind: 'new',
      newUser: { name: 'iker', alias: 'Ike' },
    })
  })

  it('shows why the pick failed and lets you try again', async () => {
    const onConfirm = open(vi.fn().mockRejectedValue(new Error('offline')))
    fireEvent.click(screen.getByRole('button', { name: 'Iker' }))
    expect(await screen.findByText('offline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iker' })).toBeEnabled()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
