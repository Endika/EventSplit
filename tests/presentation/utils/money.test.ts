import { describe, it, expect, afterAll } from 'vitest'
import i18n from '@/presentation/i18n/config'
import { formatMoney, formatSignedMoney } from '@/presentation/utils/money'

const original = i18n.language

describe('formatMoney', () => {
  afterAll(async () => {
    await i18n.changeLanguage(original)
  })

  it('writes Spanish money the Spanish way', async () => {
    await i18n.changeLanguage('es')
    // Comma decimal, symbol after the figure, and the sign before the lot —
    // never the "€-33.16" the hand-rolled formatter produced.
    expect(formatMoney(24000).replace(/\s/g, ' ')).toBe('240,00 €')
    expect(formatMoney(-3316).replace(/\s/g, ' ')).toBe('-33,16 €')
  })

  it('writes English money the English way', async () => {
    await i18n.changeLanguage('en')
    expect(formatMoney(24000)).toBe('€240.00')
  })

  it('marks what is owed to you with a plus, and zero with nothing', async () => {
    await i18n.changeLanguage('es')
    expect(formatSignedMoney(15949).replace(/\s/g, ' ')).toBe('+159,49 €')
    expect(formatSignedMoney(0).replace(/\s/g, ' ')).toBe('0,00 €')
  })
})
