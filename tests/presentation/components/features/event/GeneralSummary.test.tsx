import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { GeneralSummary } from '@/presentation/components/features/event/GeneralSummary'
import { makeEvent, makeExpense, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const users = [makeUser(ME), makeUser(uid(2))]

describe('GeneralSummary', () => {
  it('shows what the trip costs, what is out of pocket and what is pending', async () => {
    await renderWithEvent(
      <GeneralSummary />,
      makeEvent({
        users,
        expenses: [
          makeExpense(uid(20), { cents: 3000 }),
          makeExpense(uid(21), { cents: 9900, deleted: true }),
        ],
        manualLiquidations: [
          {
            id: uid(30),
            concept: 'Boat',
            cents: 1000,
            currency: 'EUR',
            paidBy: null,
            affects: [],
            paidShares: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            deleted: false,
            deletedBy: null,
            deletedAt: null,
          },
        ],
      }),
      ME,
    )
    const value = (label: string) => screen.getByText(label).nextElementSibling?.textContent
    expect(value('Total trip cost')).toBe('€40.00')
    expect(value('Actually paid')).toBe('€30.00')
    expect(value('Still pending')).toBe('€10.00')
  })

  it('renders nothing while nothing has been spent', async () => {
    await renderWithEvent(<GeneralSummary />, makeEvent({ users, expenses: [] }), ME)
    expect(screen.queryByText('General summary')).not.toBeInTheDocument()
  })
})
