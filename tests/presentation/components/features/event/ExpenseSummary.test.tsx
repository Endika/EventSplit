import { describe, it, expect } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ExpenseSummary } from '@/presentation/components/features/event/ExpenseSummary'
import { makeEvent, makeExpense, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const ANE = uid(2)

const event = () =>
  makeEvent({
    users: [makeUser(ME, { name: 'Iker' }), makeUser(ANE, { name: 'Ane' })],
    expenses: [makeExpense(uid(21), { paidBy: ME, cents: 2000, description: 'Dinner' })],
  })

describe('ExpenseSummary', () => {
  it('marks a transfer as paid and persists it', async () => {
    const app = await renderWithEvent(<ExpenseSummary />, event(), ME)
    fireEvent.click(await screen.findByRole('checkbox', { name: /mark as paid/i }))
    await waitFor(async () =>
      expect((await app.saved()).settledTransfers).toEqual([{ from: ANE, to: ME }]),
    )
  })

  it('shows the expenses I am in once unfolded', async () => {
    await renderWithEvent(<ExpenseSummary />, event(), ME)
    expect(screen.queryByText('Dinner')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /where this comes from/i }))
    expect(screen.getByText(/Dinner/)).toBeInTheDocument()
  })
})
