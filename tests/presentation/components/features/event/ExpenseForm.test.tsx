import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ExpenseForm } from '@/presentation/components/features/event/ExpenseForm'
import {
  makeEvent,
  makeExpense,
  makePurchase,
  makeUser,
  uid,
} from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const ANE = uid(2)
const P1 = uid(11)
const P2 = uid(12)

const users = [
  makeUser(ME, { name: 'Iker' }),
  makeUser(ANE, { name: 'Ane' }),
  makeUser(uid(3), { name: 'Nora', kind: 'child' }),
  makeUser(uid(4), { name: 'Rex', kind: 'dog' }),
]

const fill = (amount: string, description: string) => {
  fireEvent.change(screen.getByPlaceholderText(/amount/i), { target: { value: amount } })
  fireEvent.change(screen.getByPlaceholderText(/what was it for/i), {
    target: { value: description },
  })
}
const submit = () => fireEvent.submit(screen.getByPlaceholderText(/amount/i).closest('form')!)

describe('ExpenseForm', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('refuses an amount that is not positive and saves nothing', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(<ExpenseForm onDone={onDone} />, makeEvent({ users }), ME)
    fill('0', 'Dinner')
    submit()
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    expect((await app.saved()).expenses).toEqual([])
  })

  it('pre-fills an existing expense and saves the edit keeping its links', async () => {
    const expense = makeExpense(uid(21), {
      paidBy: ANE,
      cents: 2000,
      description: 'Groceries',
      splitAmong: [ME],
      purchaseLinks: [{ purchaseId: P1, quantity: 2 }],
    })
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <ExpenseForm expense={expense} onDone={onDone} />,
      makeEvent({
        users,
        expenses: [expense],
        purchases: [makePurchase(P1, { item: 'Rice', totalQuantity: 5 })],
      }),
      ME,
    )
    expect(screen.getByPlaceholderText(/amount/i)).toHaveValue('20')
    expect(screen.getByPlaceholderText(/what was it for/i)).toHaveValue('Groceries')
    fireEvent.change(screen.getByPlaceholderText(/what was it for/i), {
      target: { value: 'Big groceries' },
    })
    submit()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((await app.saved()).expenses[0]).toMatchObject({
      paidBy: ANE,
      cents: 2000,
      description: 'Big groceries',
      splitAmong: [ME],
      purchaseLinks: [{ purchaseId: P1, quantity: 2 }],
    })
  })

  it('warns before touching somebody whose transfer is already settled', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <ExpenseForm onDone={onDone} />,
      makeEvent({ users, settledTransfers: [{ from: ANE, to: ME }] }),
      ME,
    )
    fill('10', 'Taxi')
    submit()
    fireEvent.click(await screen.findByRole('button', { name: /add anyway/i }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((await app.saved()).expenses).toHaveLength(1)
  })

  it('does not save when the settled warning is cancelled', async () => {
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <ExpenseForm onDone={onDone} />,
      makeEvent({ users, settledTransfers: [{ from: ANE, to: ME }] }),
      ME,
    )
    fill('10', 'Taxi')
    submit()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancel$/i }))
    expect(onDone).not.toHaveBeenCalled()
    expect((await app.saved()).expenses).toEqual([])
  })

  it('hides items assigned to somebody else when only mine is on, keeping what was ticked', async () => {
    const purchases = [
      makePurchase(P1, { item: 'Rice', assignedTo: ME }),
      makePurchase(P2, { item: 'Beans', assignedTo: ANE }),
    ]
    const onDone = vi.fn()
    const app = await renderWithEvent(
      <ExpenseForm onDone={onDone} />,
      makeEvent({ users, purchases }),
      ME,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /beans/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /only mine/i }))
    expect(screen.queryByRole('checkbox', { name: /beans/i })).toBeNull()
    expect(screen.getByRole('checkbox', { name: /rice/i })).toBeInTheDocument()
    fill('4', 'Mixed')
    submit()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((await app.saved()).expenses[0]!.purchaseLinks).toEqual([
      { purchaseId: P2, quantity: 4 },
    ])
  })
})
