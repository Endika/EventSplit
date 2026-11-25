import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ExpensesTab } from '@/presentation/components/features/event/ExpensesTab'
import { makeEvent, makeExpense, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const ANE = uid(2)
const LUNCH = uid(21)
const OLD = uid(22)

const event = () =>
  makeEvent({
    users: [makeUser(ME, { name: 'Iker' }), makeUser(ANE, { name: 'Ane' })],
    expenses: [
      makeExpense(LUNCH, { paidBy: ME, cents: 1500, description: 'Lunch' }),
      makeExpense(OLD, { paidBy: ANE, cents: 700, description: 'Old taxi', deleted: true }),
    ],
  })

describe('ExpensesTab', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('opens an expense for editing with its data', async () => {
    await renderWithEvent(<ExpensesTab />, event(), ME)
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(await screen.findByPlaceholderText(/what was it for/i)).toHaveValue('Lunch')
    expect(screen.getByPlaceholderText(/amount/i)).toHaveValue('15')
  })

  it('deletes an expense after confirming', async () => {
    const app = await renderWithEvent(<ExpensesTab />, event(), ME)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(async () =>
      expect((await app.saved()).expenses.find((e) => e.id === LUNCH)!.deleted).toBe(true),
    )
  })

  it('restores a deleted expense', async () => {
    const app = await renderWithEvent(<ExpensesTab />, event(), ME)
    fireEvent.click(screen.getByRole('button', { name: /deleted \(1\)/i }))
    fireEvent.click(screen.getByRole('button', { name: /restore/i }))
    await waitFor(async () =>
      expect((await app.saved()).expenses.find((e) => e.id === OLD)!.deleted).toBe(false),
    )
  })
})
