import { CreateEventSchema, type CreateEventInput } from '@/application/dtos/CreateEventDTO'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'

export interface CreateEventResult {
  event: EventSnapshot
  creator: { id: string; displayName: string }
  version: number
}

export class CreateEventHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: CreateEventInput): Promise<CreateEventResult> {
    const parsed = CreateEventSchema.parse(input)
    const creator = User.create({ name: parsed.creatorName, alias: parsed.creatorAlias ?? null })
    const event = Event.create({ name: parsed.name, creator })
    const saved = await this.repo.create(event.toSnapshot())
    return {
      event: saved.snapshot,
      creator: { id: creator.id.value, displayName: creator.displayName },
      version: saved.version,
    }
  }
}
