import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import '@/presentation/i18n/config'
import { Modal } from '@/presentation/components/common/Modal'

/**
 * The real shape of every destructive flow in the app: a button on the page
 * opens the modal, and the modal has a way out.
 */
function Host({ dismissable = true }: { dismissable?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open it
      </button>
      <Modal
        open={open}
        title="Delete the expense"
        dismissable={dismissable}
        onClose={() => setOpen(false)}
      >
        <input aria-label="reason" />
        <button type="button">confirm</button>
      </Modal>
    </>
  )
}

const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
const tab = (shiftKey = false) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey })

describe('Modal keyboard operation', () => {
  beforeEach(() => localStorage.clear())

  it('stays open on Escape when it is not dismissable', () => {
    // The identification modal: there is nothing behind it to go back to.
    render(<Host dismissable={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'open it' }))

    escape()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('offers no close button when it is not dismissable', () => {
    render(<Host dismissable={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'open it' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('hands focus back to whatever opened it', () => {
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'open it' })
    trigger.focus()
    fireEvent.click(trigger)
    // Focus moved into the dialog on open...
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)

    escape()
    // ...and came back out to the trigger on close, not to the body.
    expect(document.activeElement).toBe(trigger)
  })

  it('takes focus to the first control inside, not to the close button', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'open it' }))

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'reason' }))
  })

  it('keeps Tab and Shift+Tab inside the dialog', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'open it' }))
    const close = screen.getByRole('button', { name: /close/i })
    const confirm = screen.getByRole('button', { name: 'confirm' })

    // Forward off the last control wraps to the first.
    confirm.focus()
    tab()
    expect(document.activeElement).toBe(close)

    // Backward off the first control wraps to the last.
    tab(true)
    expect(document.activeElement).toBe(confirm)
  })
})
