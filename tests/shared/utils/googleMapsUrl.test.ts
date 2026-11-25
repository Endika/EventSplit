import { describe, it, expect } from 'vitest'
import { buildGoogleMapsUrl } from '@/shared/utils/googleMapsUrl'

describe('buildGoogleMapsUrl', () => {
  it.each([
    [{ lat: 43.26, lng: -2.93, address: 'Bilbao' }, 'https://maps.google.com/?q=43.26,-2.93'],
    [{ lat: 0, lng: 0 }, 'https://maps.google.com/?q=0,0'],
    [
      { lat: 43.26, lng: null, address: ' Calle Mayor 1 ' },
      'https://maps.google.com/?q=Calle%20Mayor%201',
    ],
    [{ lat: null, lng: -2.93, address: 'Bilbao' }, 'https://maps.google.com/?q=Bilbao'],
    [{ address: '   ' }, null],
    [{}, null],
  ])('%o → %s', (input, expected) => {
    expect(buildGoogleMapsUrl(input)).toBe(expected)
  })
})
