import { describe, it, expect } from 'vitest'
import { errorDetails, errorMessage, errorReportLine } from '@/presentation/utils/errorDetails'

describe('errorDetails', () => {
  it('stringifies anything that is not an Error', () => {
    expect(errorDetails('oops')).toStrictEqual({ name: 'Unknown', message: 'oops' })
  })
})

describe('errorMessage', () => {
  it.each([[new Error('nope'), 'nope']])('%s -> %s', (err, expected) => {
    expect(errorMessage(err, 'fallback')).toBe(expected)
  })
})

describe('errorReportLine', () => {
  it('reads context, name and message', () => {
    expect(errorReportLine({ context: 'Home', name: 'BoomError', message: 'nope' })).toBe(
      '[Home] BoomError: nope',
    )
  })
})
