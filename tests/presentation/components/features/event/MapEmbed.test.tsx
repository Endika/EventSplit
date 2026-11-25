import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import '@/presentation/i18n/config'
import { MapEmbed } from '@/presentation/components/features/event/MapEmbed'

describe('MapEmbed', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('embeds the coordinates when it has them, else the address, and nothing without a key', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'KEY')
    const src = (props: Parameters<typeof MapEmbed>[0]) =>
      render(<MapEmbed {...props} />)
        .container.querySelector('iframe')
        ?.getAttribute('src')

    expect(src({ address: 'Calle 1', lat: 1.5, lng: 2.5 })).toBe(
      'https://www.google.com/maps/embed/v1/place?key=KEY&q=1.5%2C2.5',
    )
    expect(src({ address: 'Calle Mayor 1', lat: null, lng: null })).toContain('q=Calle%20Mayor%201')
    expect(src({ address: ' ', lat: null, lng: null })).toBeUndefined()

    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', '')
    expect(src({ address: 'Calle 1', lat: null, lng: null })).toBeUndefined()
  })
})
