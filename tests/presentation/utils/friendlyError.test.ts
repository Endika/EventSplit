import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import { friendlyError } from '@/presentation/utils/friendlyError'
import {
  ConcurrencyLimitError,
  PayloadTooLargeError,
  RateLimitedError,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'

const t = ((key: string) => `t:${key}`) as unknown as TFunction

describe('friendlyError', () => {
  it.each([
    [new ConcurrencyLimitError(), 't:errors.concurrency'],
    [new PayloadTooLargeError(), 't:errors.tooLarge'],
    [new RateLimitedError(), 't:pin.tooManyAttempts'],
    [new WrongPinError(), 't:pin.wrongPin'],
    [new Error('amount must be positive'), 'amount must be positive'],
    ['boom', 't:errors.generic'],
  ])('%s -> %s', (err, expected) => {
    expect(friendlyError(err, t)).toBe(expected)
  })
})
