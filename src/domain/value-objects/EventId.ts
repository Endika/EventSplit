import { generateEventId } from '@/shared/utils/eventIdGenerator'

export class EventId {
  private constructor(readonly value: string) {}

  static of(value: string): EventId {
    if (!/^[a-z0-9]{7}$/.test(value)) throw new Error('EventId: invalid format')
    return new EventId(value)
  }

  static generate(): EventId {
    return EventId.of(generateEventId())
  }
}
