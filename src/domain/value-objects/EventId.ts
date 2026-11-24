import { generateEventId } from '@/shared/utils/eventIdGenerator'

export const EVENT_ID_PATTERN = /^[a-z0-9]{7}$/

export class EventId {
  private constructor(readonly value: string) {}

  static of(value: string): EventId {
    if (!EVENT_ID_PATTERN.test(value)) throw new Error('EventId: invalid format')
    return new EventId(value)
  }

  static generate(): EventId {
    return EventId.of(generateEventId())
  }
}
