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
    id: 'evt', name: 'Iker BDay', description: null, location: null,
    generalNotes: null, days: [], chosenDay: null, stage: 'planning',
    availability: {}, availabilityNote: null, users: [], purchases: [],
    expenses: [], history: [], groupOrder: [], subgroupOrder: {},
    createdAt: '2026-01-01T00:00:00.000Z', schemaVersion: 1,
    ...overrides,
  } as EventSnapshot
}

const baseBuy = {
  id: 'p1', createdBy: 'u1', kind: 'buy' as const,
  item: 'Wine', quantity: 1, unit: 'bottles',
  dailyConsumption: 1, totalQuantity: 10,
  consumers: [{ userId: 'u1', multiplier: 1 }],
  deleted: false, deletedBy: null, deletedAt: null, deleteReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  assignedTo: 'u1', purchased: false, boughtQuantity: 0,
  group: 'Drinks', subgroup: null,
}

const ikerUser = { id: 'u1', name: 'Iker', alias: null, kind: 'adult' as const,
  email: null, phone: null, dietary: null, notes: null, allergies: [],
  joinedAt: '2026-01-01T00:00:00.000Z' }

describe('formatShoppingListText', () => {
  it('renders header with event name', () => {
    const event = makeEvent({ users: [ikerUser], purchases: [baseBuy] })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('🛒 Iker BDay — Shopping list')
  })

  it('renders group and item line with assignedTo name and qty/total/unit', () => {
    const event = makeEvent({ users: [ikerUser], purchases: [baseBuy] })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('📌 Drinks')
    expect(text).toContain('• Wine — Iker · 0/10 bottles')
  })

  it('applies U+0336 strikethrough to item name when purchased', () => {
    const event = makeEvent({ users: [ikerUser],
      purchases: [{ ...baseBuy, purchased: true, boughtQuantity: 10 }] })
    const text = formatShoppingListText(event, t)
    expect(text).toMatch(/W̶i̶n̶e̶/)
    expect(text).toContain('✅')
  })

  it('omits the assignee segment for buy items when assignedTo is null', () => {
    const event = makeEvent({ users: [], purchases: [{ ...baseBuy, assignedTo: null }] })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('• Wine · 0/10 bottles')
    expect(text).not.toMatch(/Wine\s*—/)
  })

  it('omits the assignee segment for bring items when assignedTo is null', () => {
    const event = makeEvent({
      users: [],
      purchases: [
        {
          ...baseBuy,
          id: 'pBring',
          kind: 'bring',
          item: 'Ice',
          unit: 'kg',
          assignedTo: null,
        },
      ],
    })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('• Ice')
    expect(text).not.toMatch(/Ice\s*—/)
  })

  it('renders subgroup as "└ {name}" under its group', () => {
    const event = makeEvent({ users: [ikerUser],
      purchases: [{ ...baseBuy, subgroup: 'Beer' }] })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('📌 Drinks')
    expect(text).toContain('└ Beer')
  })

  it('respects event.groupOrder for groups', () => {
    const event = makeEvent({
      users: [ikerUser],
      groupOrder: ['Food', 'Drinks'],
      purchases: [
        { ...baseBuy, id: 'p1', group: 'Drinks', item: 'Wine' },
        { ...baseBuy, id: 'p2', group: 'Food', item: 'Bread', unit: 'units' },
      ],
    })
    const text = formatShoppingListText(event, t)
    const foodIdx = text.indexOf('📌 Food')
    const drinksIdx = text.indexOf('📌 Drinks')
    expect(foodIdx).toBeGreaterThanOrEqual(0)
    expect(drinksIdx).toBeGreaterThanOrEqual(0)
    expect(foodIdx).toBeLessThan(drinksIdx)
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

  it('puts ungrouped items under "No group" at the end', () => {
    const event = makeEvent({
      users: [ikerUser],
      purchases: [
        { ...baseBuy, id: 'p1', group: 'Drinks', item: 'Wine' },
        { ...baseBuy, id: 'p2', group: null, item: 'Napkins', unit: 'units' },
      ],
    })
    const text = formatShoppingListText(event, t)
    const drinksIdx = text.indexOf('📌 Drinks')
    const noGroupIdx = text.indexOf('📌 No group')
    expect(drinksIdx).toBeLessThan(noGroupIdx)
  })

  it('renders a separate "broughtSection" block for bring items', () => {
    const luisUser = { ...ikerUser, id: 'u1', name: 'Luis' }
    const event = makeEvent({
      users: [luisUser],
      purchases: [
        { ...baseBuy, id: 'p1', kind: 'bring', item: 'Tablecloth', unit: 'units',
          assignedTo: 'u1' },
      ],
    })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('📦 What people are bringing')
    expect(text).toContain('• Tablecloth — Luis')
  })

  it('formats decimals with at most 1 fractional digit (no trailing zeros)', () => {
    const eventA = makeEvent({ users: [],
      purchases: [{ ...baseBuy, totalQuantity: 4.5, assignedTo: null }] })
    expect(formatShoppingListText(eventA, t)).toContain('0/4.5 bottles')
    const eventB = makeEvent({ users: [],
      purchases: [{ ...baseBuy, totalQuantity: 4, assignedTo: null }] })
    expect(formatShoppingListText(eventB, t)).toContain('0/4 bottles')
  })

  it('shows quantity and unit for SHARED_UNIT items', () => {
    const event = makeEvent({
      users: [],
      purchases: [
        {
          ...baseBuy,
          unit: 'single',
          item: 'Olive oil',
          quantity: 3,
          totalQuantity: 3,
          assignedTo: null,
        },
      ],
    })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('• Olive oil · 0/3 single')
  })

  it('excludes soft-deleted purchases', () => {
    const event = makeEvent({ users: [],
      purchases: [{ ...baseBuy, deleted: true, item: 'Wine' }] })
    const text = formatShoppingListText(event, t)
    expect(text).not.toContain('Wine')
  })

  it('uses summed expense.purchaseLinks quantity for "bought"', () => {
    const event = makeEvent({
      users: [ikerUser],
      purchases: [baseBuy],
      expenses: [
        { id: 'e1', createdBy: 'u1', description: 'x', paidBy: 'u1',
          amount: { cents: 100, currency: 'EUR' },
          splitAmong: null, purchaseLinks: [{ purchaseId: 'p1', quantity: 3 }],
          deleted: false, deletedBy: null, deletedAt: null, deleteReason: null,
          createdAt: '2026-01-01T00:00:00.000Z' } as never,
      ],
    })
    const text = formatShoppingListText(event, t)
    expect(text).toContain('• Wine — Iker · 3/10 bottles')
  })

  it('returns empty string when there are no non-deleted purchases', () => {
    const event = makeEvent({ purchases: [] })
    expect(formatShoppingListText(event, t)).toBe('')
  })
})
