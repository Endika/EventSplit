import { describe, it, expect } from 'vitest'
import { Container } from '@/shared/di/Container'

describe('Container', () => {
  it('caches the singleton across resolves', () => {
    const c = new Container()
    let n = 0
    c.register('counter', () => ({ id: ++n }))
    expect(c.resolve<{ id: number }>('counter')).toBe(c.resolve<{ id: number }>('counter'))
  })

  it('throws on unknown key', () => {
    const c = new Container()
    expect(() => c.resolve('nope')).toThrow(/not registered/)
  })
})
