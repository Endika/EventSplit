import { describe, it, expect } from 'vitest'
import { errorDetails } from '@/presentation/utils/errorDetails'

describe('errorDetails', () => {
  it('stringifies anything that is not an Error', () => {
    expect(errorDetails('oops')).toStrictEqual({ name: 'Unknown', message: 'oops' })
  })
})
