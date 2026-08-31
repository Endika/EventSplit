import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@/presentation/i18n/config'
import { CloneBlockTree } from '@/presentation/components/features/clone/CloneBlockTree'
import type { CloneSelection } from '@/domain/services/buildClonePatch'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { UserSnapshot } from '@/domain/entities/User'

function user(id: string, name: string, over: Partial<UserSnapshot> = {}): UserSnapshot {
  return {
    id,
    name,
    alias: null,
    joinedAt: '2026-01-01T00:00:00.000Z',
    email: null,
    phone: null,
    allergies: [],
    dietary: null,
    notes: null,
    kind: 'adult',
    ...over,
  }
}

function item(id: string, over: Partial<PurchaseSnapshot> = {}): PurchaseSnapshot {
  return {
    id,
    createdBy: 'su1',
    kind: 'buy',
    item: `Item ${id}`,
    quantity: 1,
    unit: 'units',
    dailyConsumption: 1,
    totalQuantity: 2,
    consumers: [{ userId: 'su1', multiplier: 1 }],
    deleted: false,
    deletedBy: null,
    deletedAt: null,
    deleteReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    assignedTo: null,
    purchased: false,
    boughtQuantity: 0,
    group: null,
    subgroup: null,
    ...over,
  }
}

function snap(over: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'su1',
    description: null,
    location: null,
    generalNotes: null,
    wifiPassword: null,
    emergencyContact: null,
    users: [],
    availability: {},
    availabilityNote: null,
    chosenOptions: [],
    dayOptions: [],
    purchases: [],
    groupOrder: [],
    subgroupOrder: {},
    expenses: [],
    hasPin: false,
    stage: 'doodle',
    settledTransfers: [],
    manualLiquidations: [],
    history: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const empty: CloneSelection = {
  dayOptions: false,
  userIds: [],
  mergeUserIds: [],
  purchaseIds: [],
  site: { location: false, emergencyContact: false, wifiPassword: false, generalNotes: false },
}

const fullSource = snap({
  dayOptions: [{ start: '2026-06-05', end: '2026-06-05', note: null }],
  users: [user('su1', 'Ana'), user('su2', 'Luis', { dietary: 'vegana' })],
  purchases: [
    item('p1', { item: 'Leche', group: 'Nevera' }),
    item('p2', { item: 'Queso', group: 'Nevera' }),
    item('p3', { item: 'Pan' }),
    item('p4', { item: 'Borrado', deleted: true }),
  ],
  groupOrder: ['Nevera'],
  emergencyContact: '600123456',
})

const box = (name: RegExp | string) => screen.getByRole('checkbox', { name })

describe('CloneBlockTree', () => {
  it('shows a block per kind of thing the source has', () => {
    render(
      <CloneBlockTree source={fullSource} target={snap({})} selection={empty} onChange={vi.fn()} />,
    )
    expect(box(/d(í|i)as|days|egun|dies/i)).toBeInTheDocument()
    expect(box(/participantes|participants|partaide/i)).toBeInTheDocument()
    expect(box(/compra|shopping|erosketa/i)).toBeInTheDocument()
    expect(box(/sitio|site|leku|lloc/i)).toBeInTheDocument()
  })

  it('hides a block the source has nothing for', () => {
    render(
      <CloneBlockTree source={snap({})} target={snap({})} selection={empty} onChange={vi.fn()} />,
    )
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('ticking a group ticks every item under it', () => {
    const onChange = vi.fn()
    render(
      <CloneBlockTree
        source={fullSource}
        target={snap({})}
        selection={empty}
        onChange={onChange}
      />,
    )
    fireEvent.click(box('Nevera'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ purchaseIds: ['p1', 'p2'] }))
  })

  it('a group with some items ticked reads as mixed', () => {
    render(
      <CloneBlockTree
        source={fullSource}
        target={snap({})}
        selection={{ ...empty, purchaseIds: ['p1'] }}
        onChange={vi.fn()}
      />,
    )
    expect((box('Nevera') as HTMLInputElement).indeterminate).toBe(true)
    expect((box('Nevera') as HTMLInputElement).checked).toBe(false)
  })

  it('a group with every item ticked reads as on', () => {
    render(
      <CloneBlockTree
        source={fullSource}
        target={snap({})}
        selection={{ ...empty, purchaseIds: ['p1', 'p2'] }}
        onChange={vi.fn()}
      />,
    )
    expect((box('Nevera') as HTMLInputElement).checked).toBe(true)
    expect((box('Nevera') as HTMLInputElement).indeterminate).toBe(false)
  })

  it('never offers a deleted purchase', () => {
    render(
      <CloneBlockTree source={fullSource} target={snap({})} selection={empty} onChange={vi.fn()} />,
    )
    expect(screen.queryByText('Borrado')).not.toBeInTheDocument()
  })

  it('flags a participant whose name is already in the target', () => {
    render(
      <CloneBlockTree
        source={fullSource}
        target={snap({ users: [user('t1', 'ana')] })}
        selection={empty}
        onChange={vi.fn()}
      />,
    )
    expect(document.querySelector('[data-user="su1"]')).toHaveAttribute('data-duplicate', 'true')
    expect(document.querySelector('[data-user="su2"]')).toHaveAttribute('data-duplicate', 'false')
    expect(
      screen.getByText(/ya hay alguien|already has this name|dago jada|ja hi ha|xa hai/i),
    ).toBeInTheDocument()
  })

  it('shows what a participant brings with them', () => {
    render(
      <CloneBlockTree source={fullSource} target={snap({})} selection={empty} onChange={vi.fn()} />,
    )
    expect(screen.getByText(/vegana/)).toBeInTheDocument()
  })

  it('does not offer a site field the source has empty', () => {
    render(
      <CloneBlockTree source={fullSource} target={snap({})} selection={empty} onChange={vi.fn()} />,
    )
    expect(document.querySelector('[data-field="emergencyContact"]')).toBeTruthy()
    expect(document.querySelector('[data-field="wifiPassword"]')).toBeNull()
    expect(document.querySelector('[data-field="location"]')).toBeNull()
  })

  it('ticking one site field leaves the others alone', () => {
    const onChange = vi.fn()
    render(
      <CloneBlockTree
        source={fullSource}
        target={snap({})}
        selection={empty}
        onChange={onChange}
      />,
    )
    fireEvent.click(box(/emergencia|emergency|larrialdi|emergència|emerxencia/i))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        site: { ...empty.site, emergencyContact: true },
      }),
    )
  })

  it('says that cloned days come with no votes', () => {
    render(
      <CloneBlockTree source={fullSource} target={snap({})} selection={empty} onChange={vi.fn()} />,
    )
    expect(
      screen.getByText(/sin votos|no votes|botorik gabe|sense vots|sen votos/i),
    ).toBeInTheDocument()
  })

  describe('the merge choice on a duplicate', () => {
    const twinTarget = snap({ users: [user('t1', 'ana')] })
    const radios = () => document.querySelectorAll<HTMLInputElement>('[data-merge="su1"] input')

    it('is hidden until the duplicate is ticked', () => {
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={empty}
          onChange={vi.fn()}
        />,
      )
      expect(radios()).toHaveLength(0)
    })

    it('never shows for a participant who is not a duplicate', () => {
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={{ ...empty, userIds: ['su1', 'su2'], mergeUserIds: ['su1'] }}
          onChange={vi.fn()}
        />,
      )
      expect(document.querySelector('[data-merge="su2"]')).toBeNull()
      expect(radios()).toHaveLength(2)
    })

    it('ticking a duplicate defaults it to merging', () => {
      const onChange = vi.fn()
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={empty}
          onChange={onChange}
        />,
      )
      fireEvent.click(box(/^Ana$/))
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: ['su1'], mergeUserIds: ['su1'] }),
      )
    })

    it('ticking someone who is not a duplicate adds no merge', () => {
      const onChange = vi.fn()
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={empty}
          onChange={onChange}
        />,
      )
      fireEvent.click(box(/^Luis/))
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: ['su2'], mergeUserIds: [] }),
      )
    })

    it('shows merging preselected and switches to creating a new one', () => {
      const onChange = vi.fn()
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={{ ...empty, userIds: ['su1'], mergeUserIds: ['su1'] }}
          onChange={onChange}
        />,
      )
      const [mergeRadio, newRadio] = [...radios()]
      expect(mergeRadio!.checked).toBe(true)
      expect(newRadio!.checked).toBe(false)

      fireEvent.click(newRadio!)
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mergeUserIds: [] }))
    })

    it('unticking a duplicate drops its merge decision', () => {
      const onChange = vi.fn()
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={{ ...empty, userIds: ['su1'], mergeUserIds: ['su1'] }}
          onChange={onChange}
        />,
      )
      fireEvent.click(box(/^Ana$/))
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: [], mergeUserIds: [] }),
      )
    })

    it('ticking the whole block defaults every duplicate to merging', () => {
      const onChange = vi.fn()
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={empty}
          onChange={onChange}
        />,
      )
      fireEvent.click(box(/participantes|participants|partaide/i))
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: ['su1', 'su2'], mergeUserIds: ['su1'] }),
      )
    })

    it('unticking the whole block clears every merge decision', () => {
      const onChange = vi.fn()
      render(
        <CloneBlockTree
          source={fullSource}
          target={twinTarget}
          selection={{ ...empty, userIds: ['su1', 'su2'], mergeUserIds: ['su1'] }}
          onChange={onChange}
        />,
      )
      fireEvent.click(box(/participantes|participants|partaide/i))
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: [], mergeUserIds: [] }),
      )
    })
  })
})
