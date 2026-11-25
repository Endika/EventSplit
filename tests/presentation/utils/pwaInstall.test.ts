import { describe, it, expect } from 'vitest'
import { installBanner, isIosUserAgent, isStandaloneDisplay } from '@/presentation/utils/pwaInstall'

describe('isIosUserAgent', () => {
  it.each([['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', true]])('%s -> %s', (ua, expected) => {
    expect(isIosUserAgent(ua)).toBe(expected)
  })
})

describe('isStandaloneDisplay', () => {
  it.each([
    [false, undefined, false],
    [true, undefined, true],
    [false, true, true],
  ])('display-mode %s, iOS flag %s -> %s', (matches, flag, expected) => {
    expect(isStandaloneDisplay(matches, flag)).toBe(expected)
  })
})

describe('installBanner', () => {
  it.each([
    [{ dismissed: true, standalone: false, canPrompt: true, iosHint: true }, null],
    [{ dismissed: false, standalone: false, canPrompt: true, iosHint: true }, 'native'],
    [{ dismissed: false, standalone: false, canPrompt: false, iosHint: true }, 'ios'],
  ])('%j -> %s', (state, expected) => {
    expect(installBanner(state)).toBe(expected)
  })
})
