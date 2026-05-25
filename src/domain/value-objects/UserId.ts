import { uuidv7 } from 'uuidv7'

const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export class UserId {
  private constructor(readonly value: string) {}

  static of(value: string): UserId {
    if (!UUID_V7_RE.test(value)) throw new Error('UserId: invalid format (expected UUIDv7)')
    return new UserId(value)
  }

  static generate(): UserId {
    return UserId.of(uuidv7())
  }
}
