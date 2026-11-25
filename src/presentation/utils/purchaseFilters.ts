import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { live } from '@/presentation/utils/collections'

/** Every item that is bought with money; brought-from-home items are never on an expense. */
export const buyableItems = (purchases: readonly PurchaseSnapshot[]): PurchaseSnapshot[] =>
  live(purchases).filter((p) => p.kind !== 'bring')

export const assignedTo = (
  purchases: readonly PurchaseSnapshot[],
  userId: string | undefined,
): PurchaseSnapshot[] => purchases.filter((p) => p.assignedTo === userId)

export const visiblePurchases = (
  purchases: readonly PurchaseSnapshot[],
  onlyMine: boolean,
  userId: string | undefined,
): PurchaseSnapshot[] => (onlyMine ? assignedTo(purchases, userId) : [...purchases])
