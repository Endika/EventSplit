import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/presentation/components/common/Input'
import { searchAddresses } from '@/infrastructure/geo/photonSearch'
import {
  googleAutocomplete,
  googlePlaceDetails,
  type PlaceSuggestion,
} from '@/infrastructure/geo/googlePlaces'
import { reportError } from '@/shared/utils/reportError'

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
  const { t, i18n } = useTranslation()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [error, setError] = useState<string | null>(null)
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

  async function runSearch(query: string, lang: string) {
    try {
      let results: Suggestion[]
      if (key) {
        let google: PlaceSuggestion[] | null
        try {
          google = await googleAutocomplete(query, key)
        } catch {
          // Google failed outright (bad/expired key, quota, no network): fall
          // back to the keyless Photon search instead of showing nothing.
          google = null
        }
        // Empty (genuinely no matches, or Google failed) still gets one Photon
        // try; if that one throws, it must reach the outer catch directly —
        // not get treated as "Google failed" and retried a second time.
        results =
          google !== null && google.length > 0
            ? google.map((r) => ({ label: r.label, placeId: r.placeId }))
            : await searchAddresses(query, lang)
      } else {
        results = await searchAddresses(query, lang)
      }
      if (!mountedRef.current || query !== latestQueryRef.current) return
      setSuggestions(results)
      setError(null)
    } catch (err) {
      if (!mountedRef.current || query !== latestQueryRef.current) return
      setSuggestions([])
      reportError('AddressAutocomplete', err)
      setError(t('location.addressSearchError'))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    onChange({ address: text, lat: null, lng: null })
    setError(null)

    if (timerRef.current !== null) clearTimeout(timerRef.current)
    latestQueryRef.current = text
    timerRef.current = setTimeout(() => {
      void runSearch(text, i18n.language)
    }, 300)
  }

  const handlePick = (s: Suggestion) => {
    if (s.placeId && key) {
      setError(null)
      void googlePlaceDetails(s.placeId, key)
        .then((details) => {
          if (!mountedRef.current) return
          if (details) {
            onChange({
              address: details.label,
              lat: details.lat,
              lng: details.lng,
              name: details.name,
            })
          } else {
            // 200 OK but no coordinates/address for this place: saving it as
            // typed would look fine while silently dropping the map pin.
            // Keep whatever is already typed and say the pick failed instead.
            setError(t('location.addressDetailsError'))
          }
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return
          reportError('AddressAutocomplete', err)
          setError(t('location.addressDetailsError'))
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
        <ul className="overflow-hidden border-2 border-rail bg-surface shadow-md">
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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
