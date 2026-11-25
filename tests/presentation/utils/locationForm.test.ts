import { describe, it, expect } from 'vitest'
import {
  hasLocationDetails,
  hasMapSubject,
  isMissingName,
  mapQuery,
  mapSubject,
  toLocationFields,
  toLocationInput,
} from '@/presentation/utils/locationForm'

const blank = { name: '', address: '', lat: '', lng: '', postalCode: '' }

describe('locationForm', () => {
  it.each([
    ['a typed latitude', { lat: '1' }, true],
    ['blanks only', { address: ' ', lat: ' ', lng: ' ', postalCode: ' ' }, false],
  ])('%s: details are %s, and a name is needed only with them', (_, over, details) => {
    const f = { ...blank, ...over }
    expect([
      hasLocationDetails(f),
      isMissingName(f),
      isMissingName({ ...f, name: 'Casa' }),
    ]).toEqual([details, details, false])
  })

  it('builds the handler input, dropping blanks and unreadable coordinates', () => {
    expect(
      toLocationInput({
        name: ' Casa ',
        address: ' Calle 1 ',
        lat: '40.5',
        lng: 'x',
        postalCode: '',
      }),
    ).toEqual({ name: 'Casa', address: 'Calle 1', lat: 40.5, lng: null, postalCode: null })
    expect(toLocationInput({ ...blank, name: 'Casa', lng: '-3.7', postalCode: ' 28001 ' })).toEqual(
      {
        name: 'Casa',
        address: null,
        lat: null,
        lng: -3.7,
        postalCode: '28001',
      },
    )
  })

  it('clears the location when the name is blank', () => {
    expect(toLocationInput({ ...blank, name: '  ', address: 'Calle 1' })).toBeNull()
  })

  it('fills the fields from a saved location, or empty', () => {
    const loc = {
      name: 'Casa',
      address: 'Calle 1',
      lat: 40.5,
      lng: 0,
      postalCode: '1',
      googleMapsUrl: null,
    }
    expect(toLocationFields(loc)).toEqual({
      name: 'Casa',
      address: 'Calle 1',
      lat: '40.5',
      lng: '0',
      postalCode: '1',
    })
    expect(toLocationFields(null)).toEqual(blank)
  })

  it.each([
    [{ address: '', lat: '1', lng: '2' }, true],
    [{ address: ' ', lat: '', lng: '' }, false],
    [{ address: '', lat: ' ', lng: '2' }, false],
    [{ address: '', lat: '1', lng: ' ' }, false],
  ])('map subject of %j is %s', (f, expected) => {
    expect(hasMapSubject(f)).toBe(expected)
  })

  it('hands the map the typed fields as numbers and trimmed text', () => {
    expect(mapSubject({ address: ' x ', lat: '1.5', lng: ' ' })).toEqual({
      address: 'x',
      lat: 1.5,
      lng: null,
    })
    expect(mapSubject({ address: ' ', lat: ' ', lng: '0' })).toEqual({
      address: null,
      lat: null,
      lng: 0,
    })
  })

  it.each([
    ['Calle 1', 0, 0, '0,0'],
    [' Calle 1 ', null, 2.5, 'Calle 1'],
    ['Calle 1', 1.5, null, 'Calle 1'],
    [null, null, null, null],
  ])('map query of %j,%j,%j is %j', (address, lat, lng, expected) => {
    expect(mapQuery(address, lat, lng)).toBe(expected)
  })
})
