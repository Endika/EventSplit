import { describe, it, expect } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { StageSelector } from '@/presentation/components/features/event/StageSelector'
import { makeEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const users = [makeUser(ME), makeUser(uid(2))]

describe('StageSelector', () => {
  it('asks before moving to another stage, then saves it', async () => {
    const app = await renderWithEvent(<StageSelector />, makeEvent({ users, stage: 'doodle' }), ME)
    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }))
    expect((await app.saved()).stage).toBe('doodle')
    fireEvent.click(screen.getByRole('button', { name: /go to this phase/i }))
    await waitFor(async () => expect((await app.saved()).stage).toBe('expenses'))
    expect(screen.getByRole('button', { name: 'Accounts' })).toHaveAttribute('aria-pressed', 'true')

    const written = (await app.saved()).history.length
    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }))
    fireEvent.click(screen.getByRole('button', { name: /go to this phase/i }))
    expect((await app.saved()).history).toHaveLength(written)
  })
})
