import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/presentation/components/common/Input'
import { searchAddresses } from '@/infrastructure/geo/photonSearch'
import { googleAutocomplete, googlePlaceDetails } from '@/infrastructure/geo/googlePlaces'

export interface AddressPick {
  address: string
  lat: number | null
  lng: number | null
  /** Place display name (venue) — only set when picked from Google Places. */
  name?: string
}

interface Props {
  value: string
  onChange: (v: AddressPick) => void
  placeholder?: string
}

interface Suggestion {
  label: string
  placeId?: string
  lat?: number
  lng?: number
}

/**
 * Address field with Google Places autocomplete (keyless Photon fallback).
 * Picking a Google suggestion returns coords + the venue display name.
 */
export function AddressAutocomplete({ value, onChange, placeholder }: Props) {
  const { i18n } = useTranslation()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const latestQueryRef = useRef('')

  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    onChange({ address: text, lat: null, lng: null })

    if (timerRef.current !== null) clearTimeout(timerRef.current)
    latestQueryRef.current = text
    timerRef.current = setTimeout(() => {
      const query = text
      const lang = i18n.language

      if (key) {
        void googleAutocomplete(query, key)
          .then(async (results) => {
            if (!mountedRef.current || query !== latestQueryRef.current) return
            if (results.length > 0) {
              setSuggestions(results.map((r) => ({ label: r.label, placeId: r.placeId })))
            } else {
              const fallback = await searchAddresses(query, lang)
              if (mountedRef.current && query === latestQueryRef.current) setSuggestions(fallback)
            }
          })
          .catch(() => {
            void searchAddresses(query, lang).then((fallback) => {
              if (mountedRef.current && query === latestQueryRef.current) setSuggestions(fallback)
            })
          })
      } else {
        void searchAddresses(query, lang).then((results) => {
          if (mountedRef.current && query === latestQueryRef.current) setSuggestions(results)
        })
      }
    }, 300)
  }

  const handlePick = (s: Suggestion) => {
    if (s.placeId && key) {
      void googlePlaceDetails(s.placeId, key).then((details) => {
        if (details) {
          onChange({
            address: details.label,
            lat: details.lat,
            lng: details.lng,
            name: details.name,
          })
        } else {
          onChange({ address: s.label, lat: null, lng: null })
        }
      })
    } else {
      onChange({ address: s.label, lat: s.lat ?? null, lng: s.lng ?? null })
    }
    setSuggestions([])
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        autoComplete="off"
        maxLength={200}
      />
      {suggestions.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface shadow-md">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-base text-ink hover:bg-elevated sm:text-sm"
                onClick={() => handlePick(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
