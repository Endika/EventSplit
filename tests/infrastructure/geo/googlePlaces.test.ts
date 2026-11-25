import { describe, it, expect, afterEach, vi } from 'vitest'
import { googleAutocomplete, googlePlaceDetails } from '@/infrastructure/geo/googlePlaces'
import { GeoLookupError } from '@/infrastructure/geo/errors'

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubNoNetwork() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  )
}

describe('googleAutocomplete', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the query with the API key and returns only the complete suggestions', async () => {
    const fetchMock = stubFetch({
      suggestions: [
        { placePrediction: { placeId: 'p1', text: { text: '221B Baker Street' } } },
        {},
        { placePrediction: { text: { text: 'no id' } } },
        { placePrediction: { placeId: 'no-text' } },
        { placePrediction: { placeId: 'empty-text', text: {} } },
      ],
    })

    expect(await googleAutocomplete('abc', 'key')).toEqual([
      { placeId: 'p1', label: '221B Baker Street' },
    ])
    expect(fetchMock).toHaveBeenCalledWith('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': 'key' },
      body: JSON.stringify({ input: 'abc' }),
    })
  })

  it('does not fetch for a query shorter than three characters once trimmed', async () => {
    const fetchMock = stubFetch({})

    expect(await googleAutocomplete('  ab  ', 'key')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns an empty array when the server genuinely found nothing', async () => {
    stubFetch({})

    expect(await googleAutocomplete('nowhere at all', 'key')).toEqual([])
  })

  it('throws a GeoLookupError when the HTTP request fails', async () => {
    stubFetch({}, 403)

    const error = await googleAutocomplete('221B Baker', 'key').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GeoLookupError)
    expect((error as Error).name).toBe('GeoLookupError')
    expect((error as Error).message).toContain('403')
  })

  it('throws a GeoLookupError when there is no network', async () => {
    stubNoNetwork()

    await expect(googleAutocomplete('221B Baker', 'key')).rejects.toBeInstanceOf(GeoLookupError)
  })
})

describe('googlePlaceDetails', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests the place with the key and field mask and returns it', async () => {
    const fetchMock = stubFetch({
      location: { latitude: 51.5237, longitude: -0.1585 },
      formattedAddress: '221B Baker St, London',
      displayName: { text: 'Sherlock Holmes Museum' },
    })

    expect(await googlePlaceDetails('p1', 'key')).toEqual({
      label: '221B Baker St, London',
      name: 'Sherlock Holmes Museum',
      lat: 51.5237,
      lng: -0.1585,
    })
    expect(fetchMock).toHaveBeenCalledWith('https://places.googleapis.com/v1/places/p1', {
      headers: {
        'X-Goog-Api-Key': 'key',
        'X-Goog-FieldMask': 'location,formattedAddress,displayName',
      },
    })
  })

  it.each([
    [1, 2],
    [51.4769, 0],
    [0, 0],
  ])('returns a place at %d,%d, with an empty name when it has none', async (lat, lng) => {
    stubFetch({ location: { latitude: lat, longitude: lng }, formattedAddress: 'Somewhere' })

    expect(await googlePlaceDetails('p1', 'key')).toEqual({
      label: 'Somewhere',
      name: '',
      lat,
      lng,
    })
  })

  it.each([
    ['no location', { formattedAddress: 'A' }],
    ['no latitude', { location: { longitude: 2 }, formattedAddress: 'A' }],
    ['no longitude', { location: { latitude: 1 }, formattedAddress: 'A' }],
    ['no address', { location: { latitude: 1, longitude: 2 } }],
  ])('returns null when the place has %s', async (_name, body) => {
    stubFetch(body)

    expect(await googlePlaceDetails('p1', 'key')).toBeNull()
  })

  it('throws a GeoLookupError when the HTTP request fails', async () => {
    stubFetch({ location: { latitude: 1, longitude: 2 }, formattedAddress: 'A' }, 500)

    await expect(googlePlaceDetails('p1', 'key')).rejects.toThrow('500')
  })

  it('throws a GeoLookupError when there is no network', async () => {
    stubNoNetwork()

    await expect(googlePlaceDetails('p1', 'key')).rejects.toBeInstanceOf(GeoLookupError)
  })
})
