import type { ReactNode } from 'react'

export interface IconProps {
  /**
   * Tailwind sizing and colour. The glyph paints with `currentColor`, so
   * `text-danger` on the button is all a delete icon needs.
   */
  className?: string
}

/**
 * The one canvas every icon in this app is drawn on.
 *
 * Shelf-label world: 24×24, a single 2px stroke, butt caps and mitre joins —
 * printed marks that end where they end, never a rounded lozenge. Icons are
 * decorative by construction: the accessible name lives on the control, so the
 * glyph is always `aria-hidden`.
 */
export function Glyph({ className = 'size-5', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** A solid dot — eyes, the bang under an alert. Painted, not stroked. */
export function Dot({ cx, cy, r = 1 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
}
