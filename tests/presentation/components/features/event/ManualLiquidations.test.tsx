import { describe, it, expect } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ManualLiquidations } from '@/presentation/components/features/event/ManualLiquidations'
import type { ManualLiquidationSnapshot } from '@/domain/entities/ManualLiquidation'
import { makeEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const ANE = uid(2)
const users = [makeUser(ME, { name: 'Iker' }), makeUser(ANE, { name: 'Ane' })]

const liquidation = (over: Partial<ManualLiquidationSnapshot> = {}): ManualLiquidationSnapshot => ({
  id: uid(30),
  concept: 'Boat',
  cents: 1000,
  currency: 'EUR',
  paidBy: ME,
  affects: [ME, ANE],
  paidShares: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  deleted: false,
  deletedBy: null,
  deletedAt: null,
  ...over,
})

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Add manual liquidation' }))
const type = (placeholder: RegExp, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })

describe('ManualLiquidations', () => {
  it('saves a new liquidation with its payer and the people it splits, once valid', async () => {
    const app = await renderWithEvent(<ManualLiquidations />, makeEvent({ users }), ME)
    open()
    type(/concept/i, 'ab')
    type(/amount/i, '5')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    type(/concept/i, 'Boat')
    type(/amount/i, '0')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await app.saved()).manualLiquidations).toEqual([])

    type(/concept/i, ' Boat trip ')
    type(/amount/i, '12.5')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: ANE } })
    fireEvent.click(screen.getByRole('button', { name: 'Iker' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await app.saved()).manualLiquidations).toHaveLength(1))
    expect((await app.saved()).manualLiquidations[0]).toMatchObject({
      concept: 'Boat trip',
      cents: 1250,
      paidBy: ANE,
      affects: [ME],
    })
  })

  it('edits a liquidation in place, pre-filled', async () => {
    const app = await renderWithEvent(
      <ManualLiquidations />,
      makeEvent({ users, manualLiquidations: [liquidation()] }),
      ME,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByPlaceholderText(/amount/i)).toHaveValue(10)
    type(/concept/i, 'Kayak')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(async () =>
      expect((await app.saved()).manualLiquidations[0]).toMatchObject({
        concept: 'Kayak',
        cents: 1000,
      }),
    )
    expect((await app.saved()).manualLiquidations).toHaveLength(1)
  })

  it('marks a share as paid, deletes, and restores', async () => {
    const app = await renderWithEvent(
      <ManualLiquidations />,
      makeEvent({ users, manualLiquidations: [liquidation()] }),
      ME,
    )
    const [mine, anes] = screen.getAllByRole('checkbox')
    expect(mine).toBeDisabled()
    fireEvent.click(anes!)
    await waitFor(async () =>
      expect((await app.saved()).manualLiquidations[0]!.paidShares).toEqual([ANE]),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect((await app.saved()).manualLiquidations[0]!.deleted).toBe(true))
    fireEvent.click(await screen.findByRole('button', { name: /show deleted/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(async () =>
      expect((await app.saved()).manualLiquidations[0]!.deleted).toBe(false),
    )
  })
})
