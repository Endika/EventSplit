import { describe, it, expect } from 'vitest'
import {
  ConcurrencyLimitError,
  PayloadTooLargeError,
  RateLimitedError,
  StaleClientError,
  VersionConflictError,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'

describe('repository errors', () => {
  it.each([
    [
      new StaleClientError(),
      'StaleClientError',
      'STALE_CLIENT',
      'Client schema is older than the stored event; an update is required',
    ],
    [
      new ConcurrencyLimitError(),
      'ConcurrencyLimitError',
      'CONCURRENCY_LIMIT',
      'Could not save after retries: too many concurrent writes',
    ],
    [new WrongPinError(), 'WrongPinError', 'WRONG_PIN', 'Wrong or missing edit PIN'],
    [
      new PayloadTooLargeError(),
      'PayloadTooLargeError',
      'PAYLOAD_TOO_LARGE',
      'Payload exceeds the allowed size limit',
    ],
    [
      new RateLimitedError(),
      'RateLimitedError',
      'RATE_LIMITED',
      'Too many PIN attempts; try again later',
    ],
  ])('%o carries its name, code and message', (error, name, code, message) => {
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ name, code, message })
  })

  it('a version conflict reports the server version', () => {
    const error = new VersionConflictError(7)
    expect(error.currentVersion).toBe(7)
    expect(error.message).toBe('Version conflict: server is at 7')
  })
})
