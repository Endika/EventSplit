import type { ReactNode } from 'react'

/**
 * A tab's primary action, where the thumb is.
 *
 * The scene this app is built for is a phone held in one hand, standing up, so
 * the one thing people came to do cannot sit halfway down a scroll. On a phone
 * this rides in the tag colour directly above the navigation bar; on a desktop,
 * where nothing is out of reach, it stays inline at the top of the tab.
 */
export function PrimaryAction({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="hidden md:block">{children}</div>
      <div className="fixed inset-x-0 bottom-14 z-30 border-t-2 border-rail bg-bg p-2 pb-[calc(0.5rem+var(--safe-bottom))] md:hidden">
        {children}
      </div>
    </>
  )
}
