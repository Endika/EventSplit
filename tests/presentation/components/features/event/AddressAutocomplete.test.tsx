import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import i18n from '@/presentation/i18n/config'
import {
  AddressAutocomplete,
  type AddressPick,
} from '@/presentation/components/features/event/AddressAutocomplete'

function Harness() {
  const [state, setState] = useState<AddressPick>({ address: '', lat: null, lng: null })
  return (
    <div>
      <AddressAutocomplete value={state.address} onChange={setState} />
      <output data-testid="picked">{JSON.stringify(state)}</output>
    </div>
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('AddressAutocomplete', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('falls back to the keyless search when Google fails outright', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('photon.komoot.io')) {
          return jsonResponse({
            features: [
              {
                geometry: { coordinates: [-3.7, 40.4] },
                properties: { name: 'Puerta del Sol', city: 'Madrid' },
              },
            ],
          })
        }
        return jsonResponse('', 500)
      }),
    )

    render(<Harness />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Puerta del Sol' } })

    expect(await screen.findByText('Puerta del Sol, Madrid')).toBeInTheDocument()
  })

  it("shows the app's error instead of an empty list when Google and its Photon fallback both fail", async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse('', 500)),
    )

    render(<Harness />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Puerta del Sol' } })

    expect(await screen.findByText(i18n.t('errors.generic'))).toBeInTheDocument()
  })

  it("shows the app's error instead of an empty list when the keyless search fails", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse('', 500)),
    )

    render(<Harness />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Puerta del Sol' } })

    expect(await screen.findByText(i18n.t('errors.generic'))).toBeInTheDocument()
  })

  it('keeps the typed text and surfaces an error instead of saving a coordinate-less pick', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('places:autocomplete')) {
          return jsonResponse({
            suggestions: [
              { placePrediction: { placeId: 'p1', text: { text: 'Puerta del Sol, Madrid' } } },
            ],
          })
        }
        if (url.includes('/v1/places/')) return jsonResponse('', 500) // details lookup fails
        throw new Error(`unexpected fetch: ${url}`)
      }),
    )

    render(<Harness />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Puerta del S' } })
    fireEvent.click(await screen.findByText('Puerta del Sol, Madrid'))

    expect(await screen.findByText(i18n.t('errors.generic'))).toBeInTheDocument()
    const picked = JSON.parse(screen.getByTestId('picked').textContent ?? '{}') as AddressPick
    expect(picked).toEqual({ address: 'Puerta del S', lat: null, lng: null })
  })
})
