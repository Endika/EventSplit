import type { EventLocation } from '@/domain/entities/Event'

export interface LocationFields {
  name: string
  address: string
  lat: string
  lng: string
  postalCode: string
}

export const emptyToNull = (raw: string): string | null => raw.trim() || null

/** Whether anything besides the place's name was typed. */
export const hasLocationDetails = (f: LocationFields): boolean =>
  Boolean(f.address.trim() || f.lat.trim() || f.lng.trim() || f.postalCode.trim())

/** Details without a name cannot be saved: the snapshot has no place for a nameless address. */
export const isMissingName = (f: LocationFields): boolean => hasLocationDetails(f) && !f.name.trim()

function parseCoordinate(raw: string): number | null {
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** The form as the handler takes it; a blank name clears the location. */
export function toLocationInput(f: LocationFields): Omit<EventLocation, 'googleMapsUrl'> | null {
  if (!f.name.trim()) return null
  return {
    name: f.name.trim(),
    address: emptyToNull(f.address),
    lat: parseCoordinate(f.lat),
    lng: parseCoordinate(f.lng),
    postalCode: emptyToNull(f.postalCode),
  }
}

export const toLocationFields = (loc: EventLocation | null): LocationFields => ({
  name: loc?.name ?? '',
  address: loc?.address ?? '',
  lat: loc?.lat?.toString() ?? '',
  lng: loc?.lng?.toString() ?? '',
  postalCode: loc?.postalCode ?? '',
})

/** Whether the typed fields give the map something to show. */
export const hasMapSubject = (f: Pick<LocationFields, 'address' | 'lat' | 'lng'>): boolean =>
  Boolean(f.address.trim() || (f.lat.trim() && f.lng.trim()))

/** What the embedded map is asked to search for: coordinates win over the address. */
export function mapQuery(
  address: string | null,
  lat: number | null,
  lng: number | null,
): string | null {
  return lat != null && lng != null ? `${lat},${lng}` : (address ?? '').trim() || null
}

/** The typed fields as the map embed takes them. */
export const mapSubject = (f: Pick<LocationFields, 'address' | 'lat' | 'lng'>) => ({
  address: emptyToNull(f.address),
  lat: f.lat.trim() ? Number(f.lat) : null,
  lng: f.lng.trim() ? Number(f.lng) : null,
})
