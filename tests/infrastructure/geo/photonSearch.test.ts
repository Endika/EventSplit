import { describe, it, expect, afterEach, vi } from 'vitest'
import { searchAddresses } from '@/infrastructure/geo/photonSearch'
import { GeoLookupError } from '@/infrastructure/geo/errors'

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('searchAddresses', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('queries Photon with the encoded trimmed query and builds the labels', async () => {
    const fetchMock = stubFetch({
      features: [
        {
          geometry: { coordinates: [-0.1585, 51.5237] },
          properties: { name: '221B Baker St', city: 'London', country: 'UK' },
        },
        {
          geometry: { coordinates: [2, 1] },
          properties: { street: 'Main', housenumber: '5', postcode: '1000', state: 'S' },
        },
      ],
    })

    expect(await searchAddresses('  a b&  ', 'fr')).toEqual([
      { label: '221B Baker St, London, UK', lat: 51.5237, lng: -0.1585 },
      { label: 'Main 5, 1000, S', lat: 1, lng: 2 },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://photon.komoot.io/api/?q=a%20b%26&lang=fr&limit=5',
    )
  })

  it('does not fetch below three characters but does at exactly three', async () => {
    const fetchMock = stubFetch({})

    expect(await searchAddresses(' ab ', 'en')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()

    await searchAddresses('abc', 'en')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    ['en', 'en'],
    ['de', 'de'],
    ['fr', 'fr'],
    ['it', 'it'],
    ['es', 'en'],
    [undefined, 'en'],
  ])('maps the language %s to Photon language %s', async (lang, expected) => {
    const fetchMock = stubFetch({})

    await searchAddresses('abc', lang)

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`&lang=${expected}&`))
  })

  it('throws a GeoLookupError when the HTTP request fails', async () => {
    stubFetch({}, 503)

    const error = await searchAddresses('221B Baker', 'en').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GeoLookupError)
    expect((error as Error).message).toContain('503')
  })

  it('throws a GeoLookupError when there is no network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await expect(searchAddresses('221B Baker', 'en')).rejects.toBeInstanceOf(GeoLookupError)
  })
})
