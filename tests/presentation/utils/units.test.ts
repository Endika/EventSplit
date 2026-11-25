import { describe, it, expect, vi } from 'vitest'
import { displayUnit } from '@/presentation/utils/units'

describe('displayUnit', () => {
  it('translates a known unit with its count when there is one, and passes free text through', () => {
    const t = vi.fn(
      (key: string, opts?: Record<string, unknown>) => `${key}|${JSON.stringify(opts)}`,
    )
    expect(displayUnit('cajas de cartón', t, 2)).toBe('cajas de cartón')
    expect(t).not.toHaveBeenCalledWith('purchases.form.units.cajas de cartón')
    expect(displayUnit('kg', t, 2)).toBe('purchases.form.units.kg|{"count":2}')
    expect(displayUnit('kg', t, 0)).toBe('purchases.form.units.kg|{"count":0}')
    expect(displayUnit('kg', t)).toBe('purchases.form.units.kg|undefined')
  })
})
