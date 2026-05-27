import { JoinAsNewUserSchema, type JoinAsNewUserInput } from '@/application/dtos/JoinAsNewUserDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'

export interface JoinResult {
  event: EventSnapshot
  newUser: { id: string; name: string; displayName: string }
  version: number
}

export class JoinAsNewUserHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: JoinAsNewUserInput): Promise<JoinResult> {
    const parsed = JoinAsNewUserSchema.parse(input)
    const newUser = User.create({
      name: parsed.name,
      alias: parsed.alias ?? null,
      kind: parsed.kind,
    })

    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      return Event.restore(row.snapshot).addUser(newUser).toSnapshot()
    })
    return {
      event: saved.snapshot,
      newUser: { id: newUser.id.value, name: newUser.name, displayName: newUser.displayName },
      version: saved.version,
    }
  }
}
