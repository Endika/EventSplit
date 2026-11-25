import { MAX_OPTIONS, optionKey, type DayOption } from '@/domain/value-objects/DayOption'

export const isSelectionFull = (selection: readonly DayOption[]): boolean =>
  selection.length >= MAX_OPTIONS

/** Whether `option` can join the selection: not when it is full, nor when its dates are already there. */
export function addVerdict(
  selection: readonly DayOption[],
  option: DayOption,
): 'full' | 'duplicate' | 'ok' {
  if (isSelectionFull(selection)) return 'full'
  return selection.some((o) => optionKey(o) === optionKey(option)) ? 'duplicate' : 'ok'
}

export const dropFromSelection = (
  selection: readonly DayOption[],
  option: DayOption,
): DayOption[] => selection.filter((o) => optionKey(o) !== optionKey(option))

/** Whether the picked days differ from the saved ones, comparing dates only (notes are not picked here). */
export const selectionChanged = (
  selection: readonly DayOption[],
  saved: readonly DayOption[],
): boolean =>
  selection.length !== saved.length ||
  selection.some((o, i) => optionKey(o) !== optionKey(saved[i] ?? o))
