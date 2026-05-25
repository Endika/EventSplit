import { describe, it, expect } from 'vitest'
import { Container } from '@/shared/di/Container'

describe('Container', () => {
  it('returns the registered instance', () => {
    const c = new Container()
    const obj = { tag: 'x' }
    c.register('thing', () => obj)
    expect(c.resolve<typeof obj>('thing')).toBe(obj)
  })

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
