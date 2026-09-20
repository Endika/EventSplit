import { Dot, Glyph, type IconProps } from './Glyph'

export type { IconProps } from './Glyph'

/** Participants. Two heads over straight-cut shoulders. */
export function IconUsers(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 21v-2.5L5.5 15h7l3 3.5V21" />
      <circle cx="17.8" cy="9" r="2.5" />
      <path d="M17 15.5h2.2l2.3 3V21" />
    </Glyph>
  )
}

/** When: a wall calendar with its two binding posts. */
export function IconCalendar(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 6.5h17V21h-17z" />
      <path d="M3.5 11.5h17" />
      <path d="M8.5 3.5v5M15.5 3.5v5" />
    </Glyph>
  )
}

/** Where: a map marker with a sharp tip. */
export function IconLocation(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 21.5 5.2 13A8.5 8.5 0 1 1 18.8 13z" />
      <circle cx="12" cy="9.5" r="2.6" />
    </Glyph>
  )
}

/** The shopping list, and anything bought. */
export function IconCart(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M1.8 4h3.4l3 12h11.4" />
      <path d="M6.3 7.5h15.4l-1.8 6.5H7.9" />
      <circle cx="10" cy="19.6" r="1.4" />
      <circle cx="18" cy="19.6" r="1.4" />
    </Glyph>
  )
}

/** Money: a note, because this app counts cash between friends. */
export function IconMoney(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2 6h20v12H2z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5.5 9.7v4.6M18.5 9.7v4.6" />
    </Glyph>
  )
}

/** History: the clock, read as "what happened and when". */
export function IconHistory(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.5V12l4.2 2.6" />
    </Glyph>
  )
}

/** Delete. Give it `text-danger`; that is the whole point of drawing it. */
export function IconTrash(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 6.5h17" />
      <path d="M9.5 6.5v-3h5v3" />
      <path d="M5.8 6.5 7 21h10l1.2-14.5" />
      <path d="M10.3 10.5v6M13.7 10.5v6" />
    </Glyph>
  )
}

/** Edit. */
export function IconPencil(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 20.5h4.2L20.5 7.7l-4.2-4.2L3.5 16.3z" />
      <path d="M14.2 5.6l4.2 4.2" />
    </Glyph>
  )
}

/** Dismiss. */
export function IconClose(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </Glyph>
  )
}

/** Share: one thing reaching two others. */
export function IconShare(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="18" cy="5.5" r="2.8" />
      <circle cx="6" cy="12" r="2.8" />
      <circle cx="18" cy="18.5" r="2.8" />
      <path d="M8.5 10.7l6.9-3.7M8.5 13.3l6.9 3.7" />
    </Glyph>
  )
}

/** Home, and "I bring it from home". */
export function IconHome(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 11.5 12 3l9.5 8.5" />
      <path d="M5.5 9.3V21h13V9.3" />
      <path d="M9.5 21v-6.5h5V21" />
    </Glyph>
  )
}

/** Add. */
export function IconPlus(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 4.5v15M4.5 12h15" />
    </Glyph>
  )
}

/** Remove, and a person who left. */
export function IconMinus(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 12h15" />
    </Glyph>
  )
}

/** Done, bought, settled. */
export function IconCheck(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 12.3 9.3 18.5 20.5 6" />
    </Glyph>
  )
}

/** The one arrow. Everything else is this, turned. */
export function IconChevron({
  dir = 'right',
  ...props
}: IconProps & { dir?: 'up' | 'right' | 'down' | 'left' }) {
  const turn = { right: 0, down: 90, left: 180, up: 270 }[dir]
  return (
    <Glyph {...props}>
      <path d="M8.5 4 16.5 12 8.5 20" transform={`rotate(${turn} 12 12)`} />
    </Glyph>
  )
}

/**
 * The dog. It comes on the trip; it owes nothing.
 *
 * Drawn standing, in profile: a head-on dog face at 16px is a cat, and this
 * mark has to survive next to a name in a list.
 */
export function IconDog(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 10.5 6 6.5l2 3.5h5.5l4 3.5v7h-3v-4h-4.5v4h-3v-6.5l-4.5-1.5z" />
      <path d="M17.5 13.5 21 9.5" />
      <Dot cx={5.3} cy={10.2} r={0.85} />
    </Glyph>
  )
}

/** The pinned day. A pushpin, cut flat. */
export function IconPin(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8.8 3h6.4l-1.2 6.2 4 3.6H6l4-3.6z" />
      <path d="M12 12.8V21.5" />
    </Glyph>
  )
}

/** Locked with a PIN. */
export function IconLock(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 10.5h15V21h-15z" />
      <path d="M7.8 10.5V7a4.2 4.2 0 0 1 8.4 0v3.5" />
      <path d="M12 14.2v3.2" />
    </Glyph>
  )
}

/** The PIN taken off: the same lock, shackle swung clear. */
export function IconUnlock(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 10.5h15V21h-15z" />
      <path d="M7.8 10.5V7a4.2 4.2 0 0 1 8.4 0" />
      <path d="M12 14.2v3.2" />
    </Glyph>
  )
}

/** A warning. The severity rides on the colour and on the words beside it. */
export function IconAlert(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3 22.5 20.5h-21z" />
      <path d="M12 10v4.6" />
      <Dot cx={12} cy={17.6} r={1.1} />
    </Glyph>
  )
}

/** A written note, and the event copied from another. */
export function IconNote(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 2.5h9l6 6v13h-15z" />
      <path d="M13.5 2.5v6h6" />
      <path d="M8 13h8M8 16.5h8" />
    </Glyph>
  )
}

/** Brought back from the bin. */
export function IconUndo(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 8.5h11a6.5 6.5 0 0 1 0 13H7" />
      <path d="M7.5 4.5 3.5 8.5l4 4" />
    </Glyph>
  )
}

/** A change of phase, a transfer, a swap of sides. */
export function IconSwap(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 8.5h16l-4-4" />
      <path d="M21.5 15.5h-16l4 4" />
    </Glyph>
  )
}

/** The shelf label itself: what this app prints. */
export function IconTag(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 4.5h12.5l6.5 7.5-6.5 7.5H2.5z" />
      <circle cx="7" cy="12" r="1.6" />
    </Glyph>
  )
}

/** A dietary note. */
export function IconLeaf(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 21c0-9.5 6-16 17.5-17C22 15.5 15 21 6 21z" />
      <path d="M3.5 21 14.5 10" />
    </Glyph>
  )
}
