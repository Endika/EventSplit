import { describe, it, expect } from 'vitest'
import { Event, type EventSnapshot, type HistoryEntry } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { User } from '@/domain/entities/User'

const GHOST = '00000000-0000-7000-8000-000000000000'

function purchaseSnap(
  id: string,
  over: Partial<PurchaseSnapshot> & { createdBy: string },
): PurchaseSnapshot {
  return {
    id,
    item: 'Bread',
    quantity: 1,
    unit: 'units',
    dailyConsumption: 1,
    totalQuantity: 1,
    consumers: [],
    deleted: false,
    deletedBy: null,
    deletedAt: null,
    deleteReason: null,
    createdAt: '2026-01-01T00:00:00Z',
    kind: 'buy',
    assignedTo: null,
    purchased: false,
    boughtQuantity: 0,
    group: null,
    subgroup: null,
    ...over,
  }
}

function withSnapshot(event: Event, change: (snap: EventSnapshot) => void): Event {
  const snap = event.toSnapshot()
  change(snap)
  return Event.restore(snap)
}

describe('Event', () => {
  it.each([
    ['2 chars once trimmed', '  AB  ', false],
    ['3 chars once trimmed', '  ABC  ', true],
    ['100 chars', 'x'.repeat(100), true],
    ['101 chars', 'x'.repeat(101), false],
  ])('event name of %s', (_label, name, ok) => {
    const creator = User.create({ name: 'John' })
    const create = () => Event.create({ name, creator })
    if (ok) expect(create().toSnapshot().name).toBe(name.trim())
    else expect(create).toThrow(/name/)
  })

  it('starts with no groups ordered', () => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    expect(e.toSnapshot()).toMatchObject({ groupOrder: [], subgroupOrder: {} })
  })

  it('rejects a user already in the event', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator }).addUser(User.create({ name: 'Maria' }))
    expect(() => e.addUser(creator)).toThrow(/already/)
  })

  it('removeUser cleans every reference to the user and keeps everything else', () => {
    const creator = User.create({ name: 'John' })
    const maria = User.create({ name: 'Maria' })
    const eva = User.create({ name: 'Eva' })
    const [j, m, v] = [creator.id.value, maria.id.value, eva.id.value]
    const e = withSnapshot(
      Event.create({ name: 'Trip', creator }).addUser(maria).addUser(eva),
      (snap) => {
        snap.availability = { [j]: [true], [m]: [true, false], [v]: [false] }
        snap.purchases = [
          purchaseSnap('p1', {
            createdBy: j,
            assignedTo: m,
            consumers: [
              { userId: j, multiplier: 1 },
              { userId: m, multiplier: 1 },
            ],
          }),
          purchaseSnap('p2', {
            createdBy: j,
            assignedTo: j,
            consumers: [{ userId: v, multiplier: 2 }],
          }),
        ]
        snap.expenses = [
          {
            id: 'x1',
            paidBy: j,
            cents: 100,
            currency: 'EUR',
            description: 'Snacks',
            purchaseId: null,
            date: '2026-01-01T00:00:00Z',
            createdAt: '2026-01-01T00:00:00Z',
            splitAmong: [j, m, v],
            purchaseLinks: [],
            deleted: false,
            deletedBy: null,
            deletedAt: null,
          },
        ]
        snap.settledTransfers = [
          { from: m, to: j },
          { from: j, to: m },
          { from: j, to: v },
        ]
      },
    )

    const after = e.removeUser(m).toSnapshot()

    expect(after.users.map((u) => u.id)).toEqual([j, v])
    expect(after.availability).toEqual({ [j]: [true], [v]: [false] })
    expect(after.purchases.map((p) => [p.assignedTo, p.consumers.map((c) => c.userId)])).toEqual([
      [null, [j]],
      [j, [v]],
    ])
    expect(after.expenses[0]!.splitAmong).toEqual([j, v])
    expect(after.settledTransfers).toEqual([{ from: j, to: v }])
  })

  it('removeUser rejects if user paid for expenses', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    e = e.addUser(maria)
    const snap = e.toSnapshot()
    snap.expenses.push({
      id: '01900000-0000-7000-8000-000000000002',
      paidBy: maria.id.value,
      cents: 100,
      currency: 'EUR',
      description: 'Snacks',
      purchaseId: null,
      date: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      splitAmong: [],
      purchaseLinks: [],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
    e = Event.restore(snap)
    expect(() => e.removeUser(maria.id.value)).toThrow(/paid for expenses/i)
  })

  it('removeUser rejects if user created non-deleted purchases', () => {
    const creator = User.create({ name: 'John' })
    let e = Event.create({ name: 'Trip', creator })
    const maria = User.create({ name: 'Maria' })
    e = e.addUser(maria)
    const snap = e.toSnapshot()
    snap.purchases.push({
      id: '01900000-0000-7000-8000-000000000003',
      createdBy: maria.id.value,
      item: 'Coke',
      quantity: 1,
      unit: 'bottles',
      dailyConsumption: 1,
      totalQuantity: 1,
      consumers: [{ userId: maria.id.value, multiplier: 1 }],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: '2026-01-01T00:00:00Z',
      kind: 'buy',
      assignedTo: null,
      purchased: false,
      boughtQuantity: 0,
      group: null,
      subgroup: null,
    })
    e = Event.restore(snap)
    expect(() => e.removeUser(maria.id.value)).toThrow(/created purchases/i)
  })

  it('setStage rejects invalid stage', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    expect(() => e.setStage({ stage: 'invalid' as never, userId: creator.id.value })).toThrow(
      /invalid stage/i,
    )
  })

  it('setStage to same stage is a no-op (no version bump)', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const initialHistoryLen = e.toSnapshot().history.length
    const same = e.setStage({ stage: 'doodle', userId: creator.id.value })
    expect(same.toSnapshot().history.length).toBe(initialHistoryLen)
  })

  it.each([
    ['caps it after trimming', `  ${'x'.repeat(300)}`, 'x'.repeat(200)],
    ['turns blank into null', '   ', null],
  ])('setAvailabilityMeta %s', (_label, note, expected) => {
    const creator = User.create({ name: 'John' })
    const next = Event.create({ name: 'Trip', creator }).setAvailabilityMeta({
      userId: creator.id.value,
      note,
      chosenOptions: [],
    })
    expect(next.toSnapshot().availabilityNote).toBe(expected)
  })

  it('toggleSettlement adds and removes only the transfer asked for', () => {
    const creator = User.create({ name: 'John' })
    const u = creator.id.value
    const toggle = (e: Event, from: string, to: string) =>
      e.toggleSettlement({ userId: u, from, to })
    let e = Event.create({ name: 'Trip', creator })
    e = toggle(toggle(toggle(e, 'a', 'b'), 'a', 'c'), 'x', 'c')
    expect(e.toSnapshot().settledTransfers).toEqual([
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c' },
      { from: 'x', to: 'c' },
    ])
    expect(toggle(e, 'a', 'c').toSnapshot().settledTransfers).toEqual([
      { from: 'a', to: 'b' },
      { from: 'x', to: 'c' },
    ])
  })

  it('setGroupOrder drops blank and duplicate groups', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const next = e.setGroupOrder({ userId: creator.id.value, order: ['B', '', ' ', 'A', 'B'] })
    expect(next.toSnapshot().groupOrder).toEqual(['B', 'A'])
  })

  describe('renameGroup', () => {
    const creator = User.create({ name: 'John' })
    const j = creator.id.value
    const base = withSnapshot(Event.create({ name: 'Trip', creator }), (snap) => {
      snap.purchases = [
        purchaseSnap('p1', { createdBy: j, group: 'Cena', subgroup: 'Entrantes' }),
        purchaseSnap('p2', { createdBy: j, group: 'Otro' }),
      ]
      snap.groupOrder = ['Cena', 'Otro']
      snap.subgroupOrder = { Cena: ['Entrantes'], Otro: ['X'] }
    })

    it.each([
      [
        'trims and caps the new name',
        `  ${'c'.repeat(60)}`,
        ['c'.repeat(50), 'Otro'],
        { ['c'.repeat(50)]: ['Entrantes'], Otro: ['X'] },
        ['c'.repeat(50), 'Otro'],
      ],
      ['clears it when the new name is blank', '  ', ['Otro'], { Otro: ['X'] }, [null, 'Otro']],
    ])('%s', (_label, to, groupOrder, subgroupOrder, groups) => {
      const out = base.renameGroup({ userId: j, from: 'Cena', to }).toSnapshot()
      expect(out.groupOrder).toEqual(groupOrder)
      expect(out.subgroupOrder).toEqual(subgroupOrder)
      expect(out.purchases.map((p) => p.group)).toEqual(groups)
    })
  })

  describe('renameSubgroup', () => {
    const creator = User.create({ name: 'John' })
    const j = creator.id.value
    const base = withSnapshot(Event.create({ name: 'Trip', creator }), (snap) => {
      snap.purchases = [
        purchaseSnap('p1', { createdBy: j, group: 'Cena', subgroup: 'Entrantes' }),
        purchaseSnap('p2', { createdBy: j, group: 'Otro', subgroup: 'Entrantes' }),
        purchaseSnap('p3', { createdBy: j, group: 'Cena', subgroup: 'Postre' }),
      ]
      snap.subgroupOrder = { Cena: ['Entrantes', 'Postre'] }
    })
    const rename = (group: string, to: string) =>
      base.renameSubgroup({ userId: j, group, from: 'Entrantes', to }).toSnapshot()

    it.each([
      [
        'trims and caps the new name',
        `  ${'s'.repeat(60)}`,
        ['s'.repeat(50), 'Entrantes', 'Postre'],
        ['s'.repeat(50), 'Postre'],
      ],
      ['clears it when the new name is blank', '  ', [null, 'Entrantes', 'Postre'], ['Postre']],
    ])('%s', (_label, to, subgroups, order) => {
      const out = rename('Cena', to)
      expect(out.purchases.map((p) => p.subgroup)).toEqual(subgroups)
      expect(out.subgroupOrder).toEqual({ Cena: order })
    })

    it('starts an empty order for a group that had none', () => {
      expect(rename('Nueva', 'Aperitivos').subgroupOrder).toEqual({
        Cena: ['Entrantes', 'Postre'],
        Nueva: [],
      })
    })
  })

  it('setSubgroupOrder stores the order under its group, without blanks or duplicates', () => {
    const creator = User.create({ name: 'John' })
    const e = Event.create({ name: 'Trip', creator })
    const next = e.setSubgroupOrder({
      userId: creator.id.value,
      group: 'Cena',
      order: ['B', '', ' ', 'A', 'B'],
    })
    expect(next.toSnapshot().subgroupOrder['Cena']).toEqual(['B', 'A'])
  })

  it('records one history entry per action, versioned in sequence', () => {
    const creator = User.create({ name: 'John' })
    const maria = User.create({ name: 'Maria', alias: 'mari' })
    const [j, m] = [creator.id.value, maria.id.value]
    const steps: [(e: Event) => Event, HistoryEntry['type'], string, string][] = [
      [(e) => e.addUser(maria), 'user_joined', m, 'Maria (mari) joined'],
      [
        (e) => e.setStage({ stage: 'shopping', userId: m }),
        'stage_changed',
        m,
        'Maria moved to shopping stage',
      ],
      [
        (e) => e.setAvailabilityMeta({ userId: j, note: null, chosenOptions: [] }),
        'availability_voted',
        j,
        'John updated availability details',
      ],
      [
        (e) => e.toggleSettlement({ userId: j, from: m, to: j }),
        'settlement_toggled',
        j,
        'John marked Maria→John as paid',
      ],
      [
        (e) => e.toggleSettlement({ userId: j, from: m, to: j }),
        'settlement_toggled',
        j,
        'John marked Maria→John as unpaid',
      ],
      [
        (e) => e.toggleSettlement({ userId: j, from: GHOST, to: m }),
        'settlement_toggled',
        j,
        'John marked ?→Maria as paid',
      ],
      [
        (e) => e.toggleSettlement({ userId: j, from: m, to: GHOST }),
        'settlement_toggled',
        j,
        'John marked Maria→? as paid',
      ],
      [
        (e) => e.renameGroup({ userId: j, from: 'Cena', to: 'Cena 2' }),
        'purchase_edited',
        j,
        'John renamed group "Cena" to "Cena 2"',
      ],
      [
        (e) => e.renameGroup({ userId: j, from: 'Cena 2', to: ' ' }),
        'purchase_edited',
        j,
        'John renamed group "Cena 2" to "—"',
      ],
      [
        (e) => e.setGroupOrder({ userId: j, order: ['B'] }),
        'purchase_edited',
        j,
        'John reordered the shopping groups',
      ],
      [
        (e) => e.renameSubgroup({ userId: j, group: 'G', from: 'S', to: 'T' }),
        'purchase_edited',
        j,
        'John renamed subgroup "S" to "T" in group "G"',
      ],
      [
        (e) => e.renameSubgroup({ userId: j, group: 'G', from: 'T', to: '' }),
        'purchase_edited',
        j,
        'John renamed subgroup "T" to "—" in group "G"',
      ],
      [
        (e) => e.setSubgroupOrder({ userId: j, group: 'G', order: ['A'] }),
        'purchase_edited',
        j,
        'John reordered subgroups in group "G"',
      ],
      [(e) => e.removeUser(m), 'user_removed', m, 'Maria (mari) was removed from the event'],
    ]
    let e = Event.create({ name: 'Trip', creator })
    for (const [act] of steps) e = act(e)

    const history = e.toSnapshot().history
    expect(
      history.map(({ version, type, userId, description }) => ({
        version,
        type,
        userId,
        description,
      })),
    ).toEqual([
      { version: 1, type: 'event_created', userId: j, description: 'Event created: Trip' },
      ...steps.map(([, type, userId, description], i) => ({
        version: i + 2,
        type,
        userId,
        description,
      })),
    ])
    expect(new Set(history.map((h) => h.id)).size).toBe(history.length)
  })

  it('keeps only the latest 30 history entries while versions keep counting', () => {
    const creator = User.create({ name: 'John' })
    const entry = (version: number): HistoryEntry => ({
      id: `h${version}`,
      version,
      timestamp: '2026-01-01T00:00:00Z',
      type: 'stage_changed',
      userId: creator.id.value,
      description: `v${version}`,
    })
    const full = withSnapshot(Event.create({ name: 'Trip', creator }), (snap) => {
      snap.history = Array.from({ length: 30 }, (_, i) => entry(i + 1))
    })
    const next = full.setStage({ stage: 'shopping', userId: creator.id.value }).toSnapshot()
    expect(next.history).toHaveLength(30)
    expect([next.history[0]!.version, next.history.at(-1)!.version]).toEqual([2, 31])
  })
})
