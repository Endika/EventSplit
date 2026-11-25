import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { PurchasesTab } from '@/presentation/components/features/event/PurchasesTab'
import { makeEvent, makePurchase, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const ANE = uid(2)
const RICE = uid(11)
const BEANS = uid(12)
const OLD = uid(13)

const event = () =>
  makeEvent({
    users: [makeUser(ME, { name: 'Iker' }), makeUser(ANE, { name: 'Ane' })],
    purchases: [
      makePurchase(RICE, { item: 'Rice', createdBy: ME, assignedTo: ME, group: 'Pantry' }),
      makePurchase(BEANS, { item: 'Beans', createdBy: ME, assignedTo: ANE, group: 'Fresh' }),
      makePurchase(OLD, { item: 'Old milk', deleted: true, createdBy: ME }),
    ],
  })

const saved = (app: Awaited<ReturnType<typeof renderWithEvent>>, id: string) =>
  app.saved().then((e) => e.purchases.find((p) => p.id === id)!)

describe('PurchasesTab', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows only my items when only mine is on', async () => {
    await renderWithEvent(<PurchasesTab />, event(), ME)
    expect(screen.getByText('Beans')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /only mine/i }))
    expect(screen.queryByText('Beans')).toBeNull()
    expect(screen.getByText('Rice')).toBeInTheDocument()
  })

  it('persists ticking an item as bought', async () => {
    const app = await renderWithEvent(<PurchasesTab />, event(), ME)
    const row = screen.getByText('Rice').closest('li')!
    fireEvent.click(within(row).getByRole('checkbox', { name: /bought/i }))
    await waitFor(async () => expect((await saved(app, RICE)).purchased).toBe(true))
  })

  it('persists changing the buyer', async () => {
    const app = await renderWithEvent(<PurchasesTab />, event(), ME)
    const row = screen.getByText('Rice').closest('li')!
    fireEvent.change(within(row).getByRole('combobox'), { target: { value: ANE } })
    await waitFor(async () => expect((await saved(app, RICE)).assignedTo).toBe(ANE))
  })

  it('moves a group down and persists the order', async () => {
    const app = await renderWithEvent(<PurchasesTab />, event(), ME)
    fireEvent.click(screen.getAllByRole('button', { name: /^move down$/i })[0]!)
    await waitFor(async () => expect((await app.saved()).groupOrder).toEqual(['Pantry', 'Fresh']))
  })

  it('deletes after confirming and restores from the deleted list', async () => {
    const app = await renderWithEvent(<PurchasesTab />, event(), ME)
    const row = screen.getByText('Rice').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: /^delete$/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(async () => expect((await saved(app, RICE)).deleted).toBe(true))
    fireEvent.click(await screen.findByRole('button', { name: /deleted \(2\)/i }))
    fireEvent.click(
      within(screen.getByText('Old milk').closest('li')!).getByRole('button', { name: /restore/i }),
    )
    await waitFor(async () => expect((await saved(app, OLD)).deleted).toBe(false))
  })
})
