import { JoinAsNewUserSchema, type JoinAsNewUserInput } from '@/application/dtos/JoinAsNewUserDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { type IEventRepository, VersionConflictError } from '@/domain/repositories/IEventRepository'

export interface JoinResult {
  event: EventSnapshot
  newUser: { id: string; name: string; displayName: string }
  version: number
}

const MAX_RETRIES = 3

export class JoinAsNewUserHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: JoinAsNewUserInput): Promise<JoinResult> {
    const parsed = JoinAsNewUserSchema.parse(input)
    const newUser = User.create({ name: parsed.name, alias: parsed.alias ?? null })

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await this.repo.findById(parsed.eventId)
      if (!row) throw new Error('Event not found')
      const next = Event.restore(row.snapshot).addUser(newUser)
      try {
        const saved = await this.repo.update(parsed.eventId, next.toSnapshot(), row.version)
        return {
          event: saved.snapshot,
          newUser: { id: newUser.id.value, name: newUser.name, displayName: newUser.displayName },
          version: saved.version,
        }
      } catch (err) {
        if (!(err instanceof VersionConflictError)) throw err
      }
    }
    throw new Error('Could not save: too many concurrent writes')
  }
}
