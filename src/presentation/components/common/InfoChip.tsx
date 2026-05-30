import { useState } from 'react'

type Tone = 'slate' | 'amber' | 'rose'

const TONES: Record<Tone, string> = {
  slate: 'text-muted',
  amber: 'text-warn',
  rose: 'text-danger',
}

/**
 * A small inline icon that reveals a text bubble on hover (desktop, via title)
 * or tap (mobile, via click). Used to surface a person's allergies / diet.
 */
export function InfoChip({
  icon,
  label,
  tone = 'slate',
}: {
  icon: string
  label: string
  tone?: Tone
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`text-sm leading-none ${TONES[tone]} hover:opacity-80`}
      >
        {icon}
      </button>
      {open && (
        <span
          onClick={() => setOpen(false)}
          className="absolute bottom-full left-1/2 z-30 mb-1 max-w-[14rem] -translate-x-1/2 whitespace-normal rounded-md border border-border bg-elevated px-2 py-1 text-xs text-ink shadow-lg"
        >
          {label}
        </span>
      )}
    </span>
  )
}
