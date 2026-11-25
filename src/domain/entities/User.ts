import type { AllergenSnapshot } from '@/domain/value-objects/Allergen'
import { Allergen } from '@/domain/value-objects/Allergen'
import { UserId } from '@/domain/value-objects/UserId'

export const USER_KINDS = ['adult', 'child', 'dog'] as const
export type UserKind = (typeof USER_KINDS)[number]

export interface UserSnapshot {
  id: string
  name: string
  alias: string | null
  joinedAt: string
  email: string | null
  phone: string | null
  allergies: AllergenSnapshot[]
  dietary: string | null
  notes: string | null
  kind: UserKind
  /**
   * The adult answerable for a child. A minor consumes, so they keep a balance
   * of their own, but nobody settles up with a child: their debt is carried by
   * this adult. Null on adults, on dogs, and on children nobody has assigned yet.
   */
  guardianId: string | null
  /**
   * Free-text name of the group of adults who pay together (a family, a
   * couple). Settlement treats everyone sharing it as one party. Null on
   * children and dogs: a child follows their guardian's group.
   */
  household: string | null
}

export const PERSON_NAME_MIN = 2
export const PERSON_NAME_MAX = 50
export const ALIAS_MAX = 50
export const EMAIL_MAX = 100
export const PHONE_MAX = 30
export const DIETARY_MAX = 200
export const NOTES_MAX = 500
export const HOUSEHOLD_MAX = 50
export const MAX_ALLERGIES = 20

function validatePersonName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length < PERSON_NAME_MIN || trimmed.length > PERSON_NAME_MAX)
    throw new Error(`User: name must be ${PERSON_NAME_MIN}..${PERSON_NAME_MAX} chars`)
  return trimmed
}

function validateMaxLength(label: string, value: string | null, max: number): void {
  if (value && value.length > max) throw new Error(`User: ${label} must be ≤ ${max} chars`)
}

function validateKind(kind: UserKind): void {
  if (!USER_KINDS.includes(kind)) throw new Error(`User: invalid kind "${kind}"`)
}

export interface ProfileUpdate {
  name?: string
  alias?: string | null
  email?: string | null
  phone?: string | null
  allergies?: AllergenSnapshot[]
  dietary?: string | null
  notes?: string | null
  kind?: UserKind
  guardianId?: string | null
  household?: string | null
}

export type LegacyUserSnapshot =
  | UserSnapshot
  | Omit<
      UserSnapshot,
      'email' | 'phone' | 'allergies' | 'dietary' | 'notes' | 'kind' | 'guardianId' | 'household'
    >

export function backfillUserSnapshot(s: LegacyUserSnapshot): UserSnapshot {
  const full = s as UserSnapshot
  return {
    ...full,
    alias: full.alias ?? null,
    email: full.email ?? null,
    phone: full.phone ?? null,
    allergies: full.allergies ?? [],
    dietary: full.dietary ?? null,
    notes: full.notes ?? null,
    kind: full.kind ?? 'adult',
    guardianId: full.guardianId ?? null,
    household: full.household ?? null,
  }
}

export class User {
  private constructor(
    readonly id: UserId,
    readonly name: string,
    readonly alias: string | null,
    readonly joinedAt: string,
    readonly email: string | null,
    readonly phone: string | null,
    readonly allergies: AllergenSnapshot[],
    readonly dietary: string | null,
    readonly notes: string | null,
    readonly kind: UserKind,
    readonly guardianId: string | null,
    readonly household: string | null,
  ) {}

  static create(input: {
    name: string
    alias?: string | null
    kind?: UserKind
    guardianId?: string | null
  }): User {
    const name = validatePersonName(input.name)
    const alias = input.alias?.trim() || null
    validateMaxLength('alias', alias, ALIAS_MAX)
    const kind = input.kind ?? 'adult'
    validateKind(kind)
    const guardianId = kind === 'child' ? (input.guardianId ?? null) : null
    return new User(
      UserId.generate(),
      name,
      alias,
      new Date().toISOString(),
      null,
      null,
      [],
      null,
      null,
      kind,
      guardianId,
      null,
    )
  }

  static restore(s: LegacyUserSnapshot): User {
    const full = backfillUserSnapshot(s)
    return new User(
      UserId.of(full.id),
      full.name,
      full.alias,
      full.joinedAt,
      full.email,
      full.phone,
      full.allergies,
      full.dietary,
      full.notes,
      full.kind,
      full.guardianId,
      full.household,
    )
  }

  withProfile(update: ProfileUpdate): User {
    const name = update.name === undefined ? this.name : validatePersonName(update.name)

    const alias = update.alias === undefined ? this.alias : update.alias?.trim() || null
    validateMaxLength('alias', alias, ALIAS_MAX)

    const email = update.email === undefined ? this.email : update.email?.trim() || null
    validateMaxLength('email', email, EMAIL_MAX)

    const phone = update.phone === undefined ? this.phone : update.phone?.trim() || null
    validateMaxLength('phone', phone, PHONE_MAX)

    const dietary = update.dietary === undefined ? this.dietary : update.dietary?.trim() || null
    validateMaxLength('dietary', dietary, DIETARY_MAX)

    const notes = update.notes === undefined ? this.notes : update.notes?.trim() || null
    validateMaxLength('notes', notes, NOTES_MAX)

    const allergies = update.allergies === undefined ? this.allergies : update.allergies
    if (allergies.length > MAX_ALLERGIES)
      throw new Error(`User: at most ${MAX_ALLERGIES} allergies`)
    // Re-validate each allergen for safety
    allergies.forEach((a) =>
      Allergen.of({ name: a.name, severity: a.severity, notes: a.notes ?? null }),
    )

    const kind = update.kind === undefined ? this.kind : update.kind
    validateKind(kind)

    const requested = update.guardianId === undefined ? this.guardianId : update.guardianId
    // Only a child has one: stop being a child and the link goes with it, so a
    // former child can never leave a dangling guardian behind.
    const guardianId = kind === 'child' ? requested : null
    // Stryker disable next-line ConditionalExpression: a null guardian never equals the user's id, so the null check only short-circuits
    if (guardianId !== null && guardianId === this.id.value)
      throw new Error('User: guardian cannot be the child themselves')

    const requestedHousehold =
      update.household === undefined ? this.household : update.household?.trim() || null
    validateMaxLength('household', requestedHousehold, HOUSEHOLD_MAX)
    const household = kind === 'adult' ? requestedHousehold : null

    return new User(
      this.id,
      name,
      alias,
      this.joinedAt,
      email,
      phone,
      allergies,
      dietary,
      notes,
      kind,
      guardianId,
      household,
    )
  }

  get displayName(): string {
    return this.alias ? `${this.name} (${this.alias})` : this.name
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id.value,
      name: this.name,
      alias: this.alias,
      joinedAt: this.joinedAt,
      email: this.email,
      phone: this.phone,
      allergies: this.allergies.map((a) => ({ ...a })),
      dietary: this.dietary,
      notes: this.notes,
      kind: this.kind,
      guardianId: this.guardianId,
      household: this.household,
    }
  }
}
