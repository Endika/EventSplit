import { describe, it, expect, afterAll } from 'vitest'
import i18n from '@/presentation/i18n/config'
import { formatQuantity } from '@/presentation/utils/quantity'

const original = i18n.language

describe('formatQuantity', () => {
  afterAll(async () => {
    await i18n.changeLanguage(original)
  })

  it('writes a Spanish quantity with a comma, like the money beside it', async () => {
    await i18n.changeLanguage('es')
    expect(formatQuantity(1.5)).toBe('1,5')
    expect(formatQuantity(2.75)).toBe('2,75')
  })

  it('keeps whole numbers whole', async () => {
    await i18n.changeLanguage('es')
    expect(formatQuantity(3)).toBe('3')
  })

  it('rounds to two decimals rather than printing a float tail', async () => {
    await i18n.changeLanguage('en')
    expect(formatQuantity(0.1 + 0.2)).toBe('0.3')
  })
})
