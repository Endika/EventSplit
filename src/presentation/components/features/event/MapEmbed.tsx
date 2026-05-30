import { useTranslation } from 'react-i18next'

interface MapEmbedProps {
  address: string | null
  lat: number | null
  lng: number | null
}

/** Embedded Google map. Renders nothing without a key or a place to show. */
export function MapEmbed({ address, lat, lng }: MapEmbedProps) {
  const { t } = useTranslation()
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY

  if (!key) return null

  const q = lat != null && lng != null ? `${lat},${lng}` : (address ?? '').trim() || null
  if (!q) return null

  const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}`

  return (
    <iframe
      title={t('location.openInMaps')}
      className="h-48 w-full rounded-xl border border-border"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  )
}
