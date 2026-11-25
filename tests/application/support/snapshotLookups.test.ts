import { describe, it, expect } from 'vitest'
import { assertLivePurchases, memberName } from '@/application/support/snapshotLookups'
import { addPurchase, makeWorld, snapshotOf, trashPurchase } from '../../support/world'

describe('snapshotLookups', () => {
  it('names a member and falls back to "Someone" for a stranger', async () => {
    const w = await makeWorld()
    const snapshot = await snapshotOf(w)
    expect(memberName(snapshot, w.alice)).toBe('Alice')
    expect(memberName(snapshot, '018f4a8e-0000-7000-8000-000000000000')).toBe('Someone')
  })

  it('accepts links to live purchases only', async () => {
    const w = await makeWorld()
    const live = await addPurchase(w, 'Coke')
    const trashed = await addPurchase(w, 'Beer')
    await trashPurchase(w, trashed)
    const snapshot = await snapshotOf(w)
    expect(() => assertLivePurchases(snapshot, [{ purchaseId: live }])).not.toThrow()
    expect(() => assertLivePurchases(snapshot, [{ purchaseId: trashed }])).toThrow(
      `Link purchase ${trashed} not found`,
    )
  })
})
