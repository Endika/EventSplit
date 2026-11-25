import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const createClient = vi.fn(() => ({ marker: 'client' }))
vi.mock('@supabase/supabase-js', () => ({ createClient }))

async function loadGetSupabase() {
  vi.resetModules()
  return (await import('@/infrastructure/sync/SupabaseClient')).getSupabase
}

describe('getSupabase', () => {
  beforeEach(() => createClient.mockClear())
  afterEach(() => vi.unstubAllEnvs())

  it('creates one client with no session persistence and a capped realtime rate, then reuses it', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const getSupabase = await loadGetSupabase()

    const client = getSupabase()

    expect(getSupabase()).toBe(client)
    expect(createClient).toHaveBeenCalledExactlyOnceWith('https://x.supabase.co', 'anon', {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  })

  it.each([
    ['URL', '', 'anon'],
    ['anon key', 'https://x.supabase.co', ''],
  ])('throws when the %s is missing and never creates a client', async (_what, url, key) => {
    vi.stubEnv('VITE_SUPABASE_URL', url)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
    const getSupabase = await loadGetSupabase()

    expect(() => getSupabase()).toThrow('Missing VITE_SUPABASE_URL')
    expect(createClient).not.toHaveBeenCalled()
  })
})
