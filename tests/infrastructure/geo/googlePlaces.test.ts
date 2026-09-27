import { describe, it, expect, afterEach, vi } from 'vitest'
import { googleAutocomplete, googlePlaceDetails } from '@/infrastructure/geo/googlePlaces'
import { GeoLookupError } from '@/infrastructure/geo/errors'

describe('googleAutocomplete', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns suggestions from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              suggestions: [
                { placePrediction: { placeId: 'p1', text: { text: '221B Baker Street' } } },
              ],
            }),
            { status: 200 },
          ),
      ),
    )

    expect(await googleAutocomplete('221B Baker', 'key')).toEqual([
      { placeId: 'p1', label: '221B Baker Street' },
    ])
  })

  it('returns no suggestions for a query shorter than three characters', async () => {
    expect(await googleAutocomplete('ab', 'key')).toEqual([])
  })

  it('returns an empty array when the server genuinely found nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ suggestions: [] }), { status: 200 })),
    )

    expect(await googleAutocomplete('nowhere at all', 'key')).toEqual([])
  })

  it('throws instead of returning an empty list when the HTTP request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 403 })),
    )

    await expect(googleAutocomplete('221B Baker', 'key')).rejects.toBeInstanceOf(GeoLookupError)
  })

  it('throws instead of returning an empty list when there is no network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await expect(googleAutocomplete('221B Baker', 'key')).rejects.toBeInstanceOf(GeoLookupError)
  })
})

describe('googlePlaceDetails', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the place on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              location: { latitude: 51.5237, longitude: -0.1585 },
              formattedAddress: '221B Baker St, London',
              displayName: { text: 'Sherlock Holmes Museum' },
            }),
            { status: 200 },
          ),
      ),
    )

    expect(await googlePlaceDetails('p1', 'key')).toEqual({
      label: '221B Baker St, London',
      name: 'Sherlock Holmes Museum',
      lat: 51.5237,
      lng: -0.1585,
    })
  })

  it('returns null when the place genuinely has no coordinates or address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ displayName: { text: 'Nowhere' } }), { status: 200 }),
      ),
    )

    expect(await googlePlaceDetails('p1', 'key')).toBeNull()
  })

  it('throws instead of returning null when the HTTP request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )

    await expect(googlePlaceDetails('p1', 'key')).rejects.toBeInstanceOf(GeoLookupError)
  })

  it('throws instead of returning null when there is no network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await expect(googlePlaceDetails('p1', 'key')).rejects.toBeInstanceOf(GeoLookupError)
  })
})
