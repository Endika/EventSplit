/**
 * An expense stores `[]` to mean "everyone", so somebody who joins the event
 * later is automatically part of it. Collapse the selection to `[]` only when
 * every current payer is ticked.
 *
 * The comparison runs over payers, not over the whole guest list: a dog can
 * never be in the selection, so counting it here would make the check
 * impossible to satisfy and freeze every split into a literal list of names.
 */
export function toStoredSplit(
  selected: ReadonlySet<string>,
  payerIds: readonly string[],
): string[] {
  return payerIds.every((id) => selected.has(id)) ? [] : [...selected]
}
