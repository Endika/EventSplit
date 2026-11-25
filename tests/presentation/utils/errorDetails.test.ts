import { describe, it, expect } from 'vitest'
import { errorDetails } from '@/presentation/utils/errorDetails'

class BoomError extends Error {}

describe('errorDetails', () => {
  it('names the error class and keeps its message', () => {
    expect(errorDetails(new BoomError('nope'))).toStrictEqual({
      name: 'BoomError',
      message: 'nope',
    })
  })

  it('stringifies anything that is not an Error', () => {
    expect(errorDetails('oops')).toStrictEqual({ name: 'Unknown', message: 'oops' })
  })
})
