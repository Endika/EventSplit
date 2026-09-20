import type { UserSnapshot } from '@/domain/entities/User'
import { canBeGuardian } from '@/domain/services/participantRoles'

/**
 * A child's guardian has to be somebody who can actually answer for them: an
 * adult, in this event. Checked against the stored snapshot rather than the
 * request, so a stale client cannot point a child at a participant who has
 * since left or stopped being an adult.
 */
export function assertGuardianIsAnAdultOfTheEvent(
  guardianId: string | null,
  users: readonly UserSnapshot[],
): void {
  if (guardianId === null) return
  const guardian = users.find((u) => u.id === guardianId)
  if (!guardian) throw new Error(`Guardian ${guardianId} is not in this event`)
  if (!canBeGuardian(guardian.kind)) throw new Error('Only an adult can be in charge of a child')
}
