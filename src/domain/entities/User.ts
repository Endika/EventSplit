import { UserId } from '@/domain/value-objects/UserId'

export interface UserSnapshot {
  id: string
  name: string
  alias: string | null
  joinedAt: string
}

export class User {
  private constructor(
    readonly id: UserId,
    readonly name: string,
    readonly alias: string | null,
    readonly joinedAt: string,
  ) {}

  static create(input: { name: string; alias?: string | null }): User {
    const name = input.name.trim()
    if (name.length < 2 || name.length > 50) throw new Error('User: name must be 2..50 chars')
    const aliasRaw = input.alias?.trim() ?? ''
    if (aliasRaw.length > 50) throw new Error('User: alias must be ≤ 50 chars')
    const alias = aliasRaw === '' ? null : aliasRaw
    return new User(UserId.generate(), name, alias, new Date().toISOString())
  }

  static restore(s: UserSnapshot): User {
    return new User(UserId.of(s.id), s.name, s.alias, s.joinedAt)
  }

  get displayName(): string {
    return this.alias ? `${this.name} (${this.alias})` : this.name
  }

  toSnapshot(): UserSnapshot {
    return { id: this.id.value, name: this.name, alias: this.alias, joinedAt: this.joinedAt }
  }
}
