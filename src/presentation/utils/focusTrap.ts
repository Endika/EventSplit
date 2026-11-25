/** Where focus lands when a dialog opens: past the close button if there is anything else. */
export const initialFocus = <T>(controls: T[], closeButton: T | null, panel: T): T =>
  controls.find((el) => el !== closeButton) ?? controls[0] ?? panel

/**
 * Where Tab must be sent to stay inside the dialog, or null to let the browser move on.
 * Shift+Tab off the first control (or the panel itself) wraps to the last, Tab off the last wraps to the first.
 */
export function tabWrapTarget<T>(
  controls: T[],
  active: unknown,
  panel: T,
  shiftKey: boolean,
): T | null {
  if (controls.length === 0) return panel
  const first = controls[0]!
  const last = controls[controls.length - 1]!
  if (shiftKey && (active === first || active === panel)) return last
  if (!shiftKey && active === last) return first
  return null
}
