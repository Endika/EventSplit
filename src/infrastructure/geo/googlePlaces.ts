import { GeoLookupError } from './errors'

export interface PlaceSuggestion {
  placeId: string
  label: string
}

export async function googleAutocomplete(query: string, key: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return []
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify({ input: query }),
    })
    if (!res.ok)
      throw new GeoLookupError(`Google Places autocomplete failed with status ${res.status}`)
    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: { placeId?: string; text?: { text?: string } }
      }>
    }
    return (data.suggestions ?? [])
      .map((s) => {
        const pp = s.placePrediction
        if (!pp?.placeId || !pp.text?.text) return null
        return { placeId: pp.placeId, label: pp.text.text }
      })
      .filter((x): x is PlaceSuggestion => x !== null)
  } catch (err) {
    if (err instanceof GeoLookupError) throw err
    throw new GeoLookupError('Google Places autocomplete request failed')
  }
}

export async function googlePlaceDetails(
  placeId: string,
  key: string,
): Promise<{ label: string; name: string; lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'location,formattedAddress,displayName',
      },
    })
    if (!res.ok) throw new GeoLookupError(`Google Place details failed with status ${res.status}`)
    const data = (await res.json()) as {
      location?: { latitude?: number; longitude?: number }
      formattedAddress?: string
      displayName?: { text?: string }
    }
    // 200 OK but the place genuinely has no coordinates/address — a real "not found".
    if (!data.location?.latitude || !data.location?.longitude || !data.formattedAddress) return null
    return {
      label: data.formattedAddress,
      name: data.displayName?.text ?? '',
      lat: data.location.latitude,
      lng: data.location.longitude,
    }
  } catch (err) {
    if (err instanceof GeoLookupError) throw err
    throw new GeoLookupError('Google Place details request failed')
  }
}
