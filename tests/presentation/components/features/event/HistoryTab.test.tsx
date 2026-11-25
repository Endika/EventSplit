import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { HistoryTab } from '@/presentation/components/features/event/HistoryTab'
import { makeEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)
const entry = (n: number, over = {}) => ({
  id: uid(100 + n),
  version: n,
  timestamp: '2020-01-01T10:00:00.000Z',
  type: 'expense_added' as const,
  userId: ME,
  description: `entry ${n}`,
  ...over,
})

describe('HistoryTab', () => {
  it('lists the latest entry first, naming who did it', async () => {
    await renderWithEvent(
      <HistoryTab />,
      makeEvent({
        users: [makeUser(ME, { name: 'Iker' })],
        history: [entry(1), entry(2, { type: 'purchase_deleted', userId: uid(9) })],
      }),
      ME,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Purchase deleted')
    expect(rows[0]).toHaveTextContent('by ?')
    expect(rows[1]).toHaveTextContent('Expense added')
    expect(rows[1]).toHaveTextContent('by Iker')
    expect(rows[1]).toHaveTextContent('v1')
  })

  it('says so when nothing has happened yet', async () => {
    await renderWithEvent(<HistoryTab />, makeEvent({ users: [makeUser(ME)], history: [] }), ME)
    expect(screen.getByText('No activity yet.')).toBeInTheDocument()
  })
})
