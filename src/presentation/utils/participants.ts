import {
  COMMON_ALLERGENS,
  type AllergenName,
  type AllergenSeverity,
  type AllergenSnapshot,
} from '@/domain/value-objects/Allergen'
import type { UserKind } from '@/domain/entities/User'
import { canBeGuardian } from '@/domain/services/participantRoles'

const MIN_NAME_LENGTH = 2

const blankToNull = (s: string): string | null => s.trim() || null

export const hasValidName = (name: string): boolean => name.trim().length >= MIN_NAME_LENGTH

/** Two people sharing a name can only tell themselves apart by an alias. */
export const needsAlias = (
  users: readonly { name: string }[],
  name: string,
  alias: string,
): boolean => {
  const wanted = name.trim().toLowerCase()
  return users.some((u) => u.name.trim().toLowerCase() === wanted) && !alias.trim()
}

export const guardianCandidates = <T extends { id: string; kind: UserKind }>(
  users: readonly T[],
  excludeId?: string,
): T[] => users.filter((u) => canBeGuardian(u.kind) && u.id !== excludeId)

export const existingHouseholds = (users: readonly { household: string | null }[]): string[] =>
  [...new Set(users.flatMap((u) => (u.household ? [u.household] : [])))].sort()

const guardianFor = (kind: UserKind, guardianId: string): string | null =>
  kind === 'child' ? guardianId || null : null

export interface NewParticipantForm {
  name: string
  alias: string
  kind: UserKind
  guardianId: string
}

export const newParticipantFields = (f: NewParticipantForm) => ({
  name: f.name.trim(),
  alias: blankToNull(f.alias),
  kind: f.kind,
  guardianId: guardianFor(f.kind, f.guardianId),
})

export interface ProfileForm extends NewParticipantForm {
  email: string
  phone: string
  dietary: string
  notes: string
  household: string
  allergies: AllergenSnapshot[]
}

export const profileFields = (f: ProfileForm) => ({
  ...newParticipantFields(f),
  email: blankToNull(f.email),
  phone: blankToNull(f.phone),
  dietary: blankToNull(f.dietary),
  notes: blankToNull(f.notes),
  household: f.kind === 'adult' ? blankToNull(f.household) : null,
  allergies: f.allergies,
})

/** The list with the allergy added, or null when it is already there ("other" may repeat). */
export function addAllergy(
  list: readonly AllergenSnapshot[],
  entry: { name: AllergenName; severity: AllergenSeverity; notes: string },
): AllergenSnapshot[] | null {
  if (entry.name !== 'other' && list.some((a) => a.name === entry.name)) return null
  return [...list, { name: entry.name, severity: entry.severity, notes: blankToNull(entry.notes) }]
}

/** Alphabetical by label, with "other" always last. */
export const allergenOptions = (label: (name: AllergenName) => string): AllergenName[] => [
  ...COMMON_ALLERGENS.filter((n) => n !== 'other').sort((a, b) => label(a).localeCompare(label(b))),
  'other',
]
