import { describe, it, expect } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { EventTabs } from '@/presentation/components/features/event/EventTabs'
import { makeEvent, makeUser, uid } from '../../../../support/eventFixtures'
import { renderWithEvent } from '../../../../support/renderWithEvent'

const ME = uid(1)

const open = (stage: 'doodle' | 'shopping' = 'doodle') =>
  renderWithEvent(<EventTabs />, makeEvent({ stage, users: [makeUser(ME)] }), ME)

const current = () => screen.getByRole('button', { current: 'page' }).textContent
const bar = () => screen.getByRole('navigation', { name: 'Menu' })
const swipe = (dx: number, dy = 0) => {
  const content = bar().nextElementSibling!
  fireEvent.touchStart(content, { touches: [{ clientX: 300, clientY: 300 }] })
  fireEvent.touchEnd(content, { changedTouches: [{ clientX: 300 + dx, clientY: 300 + dy }] })
}

describe('EventTabs', () => {
  it("opens on the stage's own tab and reaches the others through the menu drawer", async () => {
    await open('shopping')
    expect(current()).toBe('Shopping')
    fireEvent.click(screen.getAllByRole('button', { name: 'Menu' }).at(-1)!)
    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    fireEvent.click(within(drawer).getByRole('button', { name: 'People' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByRole('button', { name: /add participant/i })).toBeInTheDocument()
  })

  it('moves to the next or previous tab on a long horizontal swipe and ignores the rest', async () => {
    await open()
    fireEvent.click(within(bar()).getByRole('button', { name: 'People' }))
    expect(current()).toBe('People')

    swipe(-40)
    swipe(-150, 150)
    expect(current()).toBe('People')
    swipe(150)
    expect(current()).toBe('People')

    swipe(-150)
    expect(current()).toBe('When')
    swipe(150)
    expect(current()).toBe('People')
  })
})
