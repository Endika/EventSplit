import { describe, it, expect } from 'vitest'
import { unitFamily, type UnitFamily } from '@/domain/services/unitFamily'

describe('unitFamily', () => {
  it('maps liters to liquids', () => {
    expect(unitFamily('liters')).toBe<UnitFamily>('liquids')
  })
  it('maps bottles and cans to bottled', () => {
    expect(unitFamily('bottles')).toBe<UnitFamily>('bottled')
    expect(unitFamily('cans')).toBe<UnitFamily>('bottled')
  })
  it('maps kg and grams to solids', () => {
    expect(unitFamily('kg')).toBe<UnitFamily>('solids')
    expect(unitFamily('grams')).toBe<UnitFamily>('solids')
  })
  it('maps units, bag, tray to other', () => {
    expect(unitFamily('units')).toBe<UnitFamily>('other')
    expect(unitFamily('bag')).toBe<UnitFamily>('other')
    expect(unitFamily('tray')).toBe<UnitFamily>('other')
  })
  it('maps the shared sentinel to shared', () => {
    expect(unitFamily('single')).toBe<UnitFamily>('shared')
  })
  it('maps unknown free-text units to other', () => {
    expect(unitFamily('paquete')).toBe<UnitFamily>('other')
    expect(unitFamily('')).toBe<UnitFamily>('other')
  })
})
