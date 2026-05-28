export type UnitFamily = 'liquids' | 'bottled' | 'solids' | 'other' | 'shared'

const MAP: Record<string, UnitFamily> = {
  liters: 'liquids',
  bottles: 'bottled',
  cans: 'bottled',
  kg: 'solids',
  grams: 'solids',
  units: 'other',
  bag: 'other',
  tray: 'other',
  single: 'shared',
}

export function unitFamily(unit: string): UnitFamily {
  return MAP[unit] ?? 'other'
}
