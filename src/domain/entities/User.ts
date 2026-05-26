import type { AllergenSnapshot } from '@/domain/value-objects/Allergen'
import { Allergen } from '@/domain/value-objects/Allergen'
import { UserId } from '@/domain/value-objects/UserId'

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
}

export interface ProfileUpdate {
  alias?: string | null
  email?: string | null
  phone?: string | null
  allergies?: AllergenSnapshot[]
  dietary?: string | null
  notes?: string | null
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
  ) {}

  static create(input: { name: string; alias?: string | null }): User {
    const name = input.name.trim()
    if (name.length < 2 || name.length > 50) throw new Error('User: name must be 2..50 chars')
    const aliasRaw = input.alias?.trim() ?? ''
    if (aliasRaw.length > 50) throw new Error('User: alias must be ≤ 50 chars')
    const alias = aliasRaw === '' ? null : aliasRaw
    return new User(
      UserId.generate(), name, alias, new Date().toISOString(),
      null, null, [], null, null,
    )
  }

  static restore(s: UserSnapshot | (Omit<UserSnapshot, 'email' | 'phone' | 'allergies' | 'dietary' | 'notes'>)): User {
    const full = s as UserSnapshot
    return new User(
      UserId.of(s.id), s.name, s.alias, s.joinedAt,
      full.email ?? null,
      full.phone ?? null,
      full.allergies ?? [],
      full.dietary ?? null,
      full.notes ?? null,
    )
  }

  withProfile(update: ProfileUpdate): User {
    const aliasRaw = update.alias === undefined ? this.alias : update.alias?.trim() ?? null
    if (aliasRaw && aliasRaw.length > 50) throw new Error('User: alias must be ≤ 50 chars')
    const alias = aliasRaw === '' ? null : aliasRaw

    const email = update.email === undefined ? this.email : (update.email?.trim() || null)
    if (email && email.length > 100) throw new Error('User: email must be ≤ 100 chars')

    const phone = update.phone === undefined ? this.phone : (update.phone?.trim() || null)
    if (phone && phone.length > 30) throw new Error('User: phone must be ≤ 30 chars')

    const dietary = update.dietary === undefined ? this.dietary : (update.dietary?.trim() || null)
    if (dietary && dietary.length > 200) throw new Error('User: dietary must be ≤ 200 chars')

    const notes = update.notes === undefined ? this.notes : (update.notes?.trim() || null)
    if (notes && notes.length > 500) throw new Error('User: notes must be ≤ 500 chars')

    const allergies = update.allergies === undefined ? this.allergies : update.allergies
    if (allergies.length > 20) throw new Error('User: at most 20 allergies')
    // Re-validate each allergen for safety
    allergies.forEach((a) => Allergen.of({ name: a.name, severity: a.severity, notes: a.notes ?? null }))

    return new User(this.id, this.name, alias, this.joinedAt, email, phone, allergies, dietary, notes)
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
    }
  }
}
