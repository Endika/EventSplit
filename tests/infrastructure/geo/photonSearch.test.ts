import { describe, it, expect, afterEach, vi } from 'vitest'
import { searchAddresses } from '@/infrastructure/geo/photonSearch'
import { GeoLookupError } from '@/infrastructure/geo/errors'

describe('searchAddresses', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns suggestions from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              features: [
                {
                  geometry: { coordinates: [-0.1585, 51.5237] },
                  properties: { name: '221B Baker St', city: 'London', country: 'UK' },
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    )

    expect(await searchAddresses('221B Baker', 'en')).toEqual([
      { label: '221B Baker St, London, UK', lat: 51.5237, lng: -0.1585 },
    ])
  })

  it('returns no suggestions for a query shorter than three characters', async () => {
    expect(await searchAddresses('ab', 'en')).toEqual([])
  })

  it('returns an empty array when Photon genuinely finds nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ features: [] }), { status: 200 })),
    )

    expect(await searchAddresses('nowhere at all', 'en')).toEqual([])
  })

  it('throws instead of returning an empty list when the HTTP request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    )

    await expect(searchAddresses('221B Baker', 'en')).rejects.toBeInstanceOf(GeoLookupError)
  })

  it('throws instead of returning an empty list when there is no network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await expect(searchAddresses('221B Baker', 'en')).rejects.toBeInstanceOf(GeoLookupError)
  })
})
