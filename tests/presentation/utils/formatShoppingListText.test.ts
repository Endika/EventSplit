import { describe, it, expect } from 'vitest'
import { formatShoppingListText } from '@/presentation/utils/formatShoppingListText'
import type { EventSnapshot } from '@/domain/entities/Event'

const STUB_TRANSLATIONS: Record<string, string> = {
  'share.format.header': '🛒 {{eventName}} — Shopping list',
  'share.format.noGroup': 'No group',
  'share.format.broughtSection': '📦 What people are bringing',
  'purchases.form.units.bottles': 'bottles',
  'purchases.form.units.units': 'units',
  'purchases.form.units.kg': 'kg',
  'purchases.form.units.single': 'single',
}

const t = (key: string, vars?: Record<string, unknown>): string => {
  let value = STUB_TRANSLATIONS[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(`{{${k}}}`, String(v))
    }
  }
  return value
}

function makeEvent(overrides: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'evt',
    name: 'Iker BDay',
    description: null,
    location: null,
    generalNotes: null,
    dayOptions: [],
    chosenOptions: [],
    stage: 'planning',
    availability: {},
    availabilityNote: null,
    users: [],
    purchases: [],
    expenses: [],
    history: [],
    groupOrder: [],
    subgroupOrder: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
    ...overrides,
  } as EventSnapshot
}

const baseBuy = {
  id: 'p1',
  createdBy: 'u1',
  kind: 'buy' as const,
  item: 'Wine',
  quantity: 1,
  unit: 'bottles',
  dailyConsumption: 1,
  totalQuantity: 10,
  consumers: [{ userId: 'u1', multiplier: 1 }],
  deleted: false,
  deletedBy: null,
  deletedAt: null,
  deleteReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  assignedTo: 'u1',
  purchased: false,
  boughtQuantity: 0,
  group: 'Drinks',
  subgroup: null,
}

const ikerUser = {
  id: 'u1',
  name: 'Iker',
  alias: null,
  kind: 'adult' as const,
  guardianId: null,
  household: null,
  email: null,
  phone: null,
  dietary: null,
  notes: null,
  allergies: [],
  joinedAt: '2026-01-01T00:00:00.000Z',
}

describe('formatShoppingListText', () => {
  it('lays the whole list out, blocks apart by one blank line and nothing trailing', () => {
    const purchases = [
      { ...baseBuy, id: 'p1', item: 'Wine', subgroup: 'Reds' },
      { ...baseBuy, id: 'p2', item: 'Beer', purchased: true },
      { ...baseBuy, id: 'p3', item: 'Bread', group: null, assignedTo: 'ghost' },
      { ...baseBuy, id: 'p4', kind: 'bring' as const, item: 'Ice', assignedTo: 'u1' },
      { ...baseBuy, id: 'p5', kind: 'bring' as const, item: 'Cups', assignedTo: null },
    ]
    const buysOnly = purchases.slice(0, 3)
    expect(formatShoppingListText(makeEvent({ users: [ikerUser], purchases }), t)).toBe(
      [
        '🛒 Iker BDay — Shopping list',
        '',
        '📌 Drinks',
        '  └ Reds',
        '     • Wine — Iker · 0/10 bottles',
        '     • B̶e̶e̶r̶ — Iker · 0/10 bottles ✅',
        '',
        '📌 No group',
        '     • Bread · 0/10 bottles',
        '',
        '📦 What people are bringing',
        '  • Ice — Iker',
        '  • Cups',
      ].join('\n'),
    )
    expect(
      formatShoppingListText(makeEvent({ users: [ikerUser], purchases: buysOnly }), t).endsWith(
        'Bread · 0/10 bottles',
      ),
    ).toBe(true)
  })

  it('respects event.subgroupOrder within a group', () => {
    const event = makeEvent({
      users: [ikerUser],
      groupOrder: ['Drinks'],
      subgroupOrder: { Drinks: ['Wines', 'Beer'] },
      purchases: [
        { ...baseBuy, id: 'p1', group: 'Drinks', subgroup: 'Beer', item: 'Mahou' },
        {
          ...baseBuy,
          id: 'p2',
          group: 'Drinks',
          subgroup: 'Wines',
          item: 'Rioja',
        },
      ],
    })
    const text = formatShoppingListText(event, t)
    const winesIdx = text.indexOf('└ Wines')
    const beerIdx = text.indexOf('└ Beer')
    expect(winesIdx).toBeLessThan(beerIdx)
  })

  it('formats decimals with at most 1 fractional digit (no trailing zeros)', () => {
    const eventA = makeEvent({
      users: [],
      purchases: [{ ...baseBuy, totalQuantity: 4.5, assignedTo: null }],
    })
    expect(formatShoppingListText(eventA, t)).toContain('0/4.5 bottles')
    const eventB = makeEvent({
      users: [],
      purchases: [{ ...baseBuy, totalQuantity: 4, assignedTo: null }],
    })
    expect(formatShoppingListText(eventB, t)).toContain('0/4 bottles')
  })

  it('excludes soft-deleted purchases', () => {
    const event = makeEvent({ users: [], purchases: [{ ...baseBuy, deleted: true, item: 'Wine' }] })
    const text = formatShoppingListText(event, t)
    expect(text).not.toContain('Wine')
  })

  it('returns empty string when there are no non-deleted purchases', () => {
    const event = makeEvent({ purchases: [] })
    expect(formatShoppingListText(event, t)).toBe('')
  })
})
