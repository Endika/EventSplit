import { useCallback, useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconClose } from '@/presentation/components/common/icons'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Everything the user can tab to, in document order. The selector already
 * rules out disabled and hidden controls; the panel's own content is either
 * rendered or it is not, so there is nothing else to filter.
 */
function focusableIn(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
}

/**
 * Everything destructive in this app goes through here — deleting an expense,
 * removing someone, changing the phase — so it has to be operable without a
 * mouse: Escape, a real close button, a focus trap, and focus handed back to
 * whatever opened it.
 *
 * `dismissable={false}` is load-bearing: the identification modal has no way
 * out because there is nothing behind it to go back to.
 */
export function Modal({
  open,
  title,
  children,
  dismissable = true,
  onClose,
}: {
  open: boolean
  title: ReactNode
  children: ReactNode
  dismissable?: boolean
  onClose?: () => void
}) {
  const { t } = useTranslation()
  // A fixed id collided whenever two modals stacked, which is exactly when a
  // screen reader most needs to know which one it is in.
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    triggerRef.current = document.activeElement as HTMLElement | null

    // React's own autoFocus has already run; don't fight a form that chose its
    // own first field.
    if (!panel.contains(document.activeElement)) {
      const controls = focusableIn(panel)
      const first = controls.find((el) => el !== closeRef.current) ?? controls[0] ?? panel
      first.focus()
    }

    return () => {
      const trigger = triggerRef.current
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        if (!dismissable) return
        // Stop here so a stacked modal only closes the one on top.
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const controls = focusableIn(panel)
      if (controls.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = controls[0]!
      const last = controls[controls.length - 1]!
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [dismissable, onClose],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={dismissable ? onClose : undefined}
    >
      {/* Square cut and ruled off: a label, not a floating card. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-md flex-col border-2 border-rail bg-surface shadow-2xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-start justify-between gap-2 border-b-2 border-rail pl-4 pr-1 py-1">
          <h2
            id={titleId}
            className="self-center py-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink"
          >
            {title}
          </h2>
          {dismissable && onClose && (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex size-11 shrink-0 items-center justify-center text-muted hover:bg-elevated hover:text-ink"
            >
              <IconClose />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
