import { describe, it, expect } from 'vitest'
import type { CloneSelection } from '@/domain/services/buildClonePatch'
import type { UserSnapshot } from '@/domain/entities/User'
import {
  duplicateUserIds,
  formatSourceDate,
  isEmptySelection,
  presentSiteFields,
  siteSelection,
  userDetails,
  withMerge,
} from '@/presentation/utils/cloneSelection'

const NONE: CloneSelection = {
  dayOptions: false,
  userIds: [],
  mergeUserIds: [],
  purchaseIds: [],
  site: { location: false, emergencyContact: false, wifiPassword: false, generalNotes: false },
}
const person = (id: string, name: string) => ({ id, name }) as UserSnapshot

describe('isEmptySelection', () => {
  it.each([
    ['nothing', NONE, true],
    ['days', { ...NONE, dayOptions: true }, false],
    ['a person', { ...NONE, userIds: ['u'] }, false],
    ['a purchase', { ...NONE, purchaseIds: ['p'] }, false],
    ['a site field', { ...NONE, site: { ...NONE.site, wifiPassword: true } }, false],
  ])('%s -> %s', (_, selection, expected) => {
    expect(isEmptySelection(selection)).toBe(expected)
  })
})

describe('withMerge', () => {
  it.each([
    [['a'], true, ['a', 'b']],
    [['a', 'b'], false, ['a']],
  ])('%j with merge %s -> %j', (ids, merge, expected) => {
    expect(withMerge(ids, 'b', merge)).toStrictEqual(expected)
  })
})

describe('duplicateUserIds', () => {
  it('matches namesakes by trimmed, case-insensitive name', () => {
    const source = [person('s1', 'Ana'), person('s2', 'Bob'), person('s3', ' CARLA ')]
    const target = [person('t1', 'ana'), person('t2', 'Carla')]
    expect(duplicateUserIds(source, target)).toStrictEqual(new Set(['s1', 's3']))
  })
})

describe('userDetails', () => {
  it.each([
    [null, [], ''],
    ['vegan', ['milk', 'egg'], 'vegan · milk, egg'],
  ])('diet %s with allergies %j -> "%s"', (dietary, names, expected) => {
    const allergies = names.map((name) => ({ name })) as UserSnapshot['allergies']
    expect(userDetails({ dietary, allergies })).toBe(expected)
  })
})

describe('site fields', () => {
  it.each([
    [{ location: null, emergencyContact: null, wifiPassword: '', generalNotes: '' }, false],
    [
      { location: { name: 'x' }, emergencyContact: 'a', wifiPassword: 'b', generalNotes: 'c' },
      true,
    ],
  ])('%j are present: %s', (source, all) => {
    const expected = { location: all, emergencyContact: all, wifiPassword: all, generalNotes: all }
    expect(presentSiteFields(source as never)).toStrictEqual(expected)
  })

  const A = { location: true, emergencyContact: false, wifiPassword: true, generalNotes: false }
  const B = { location: false, emergencyContact: true, wifiPassword: false, generalNotes: true }

  it.each([
    [A, true, A],
    [B, true, B],
  ])('ticking %j to %s only touches what is present', (present, on, expected) => {
    expect(siteSelection(present, on)).toStrictEqual(expected)
  })
})

describe('formatSourceDate', () => {
  it.each([
    ['2026-03-05T10:00:00Z', 'Mar 5, 2026'],
    ['not-a-date-at-all', 'not-a-date'],
  ])('%s -> %s', (iso, expected) => {
    expect(formatSourceDate(iso, 'en')).toBe(expected)
  })
})
