export function buildGoogleMapsUrl(input: {
  lat?: number | null
  lng?: number | null
  address?: string | null
}): string | null {
  if (typeof input.lat === 'number' && typeof input.lng === 'number') {
    return `https://maps.google.com/?q=${input.lat},${input.lng}`
  }
  const addr = input.address?.trim()
  if (addr) {
    return `https://maps.google.com/?q=${encodeURIComponent(addr)}`
  }
  return null
}
