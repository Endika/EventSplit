export interface AddressSuggestion {
  label: string
  lat: number
  lng: number
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

function toLabel(p: Record<string, string | undefined>): string {
  const street = [p.name ?? p.street, p.housenumber].filter(Boolean).join(' ')
  return [street, p.postcode, p.city, p.state, p.country].filter(Boolean).join(', ')
}

export async function searchAddresses(query: string, lang = 'en'): Promise<AddressSuggestion[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const supported = ['en', 'de', 'fr', 'it']
  const photonLang = supported.includes(lang) ? lang : 'en'
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=${photonLang}&limit=5`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as { features?: PhotonFeature[] }
    return (data.features ?? []).map((f) => ({
      label: toLabel(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }))
  } catch {
    return []
  }
}
