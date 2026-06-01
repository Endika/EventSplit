import { uuidv7 } from 'uuidv7'
import { Money } from '@/domain/value-objects/Money'

export interface ManualLiquidationSnapshot {
  id: string
  concept: string
  cents: number
  currency: 'EUR'
  /** null = pending (nobody fronted it); a userId = that participant advanced the full amount. */
  paidBy: string | null
  /** Participants the cost is split among. Empty array means "all current participants". */
  affects: string[]
  /** Affected userIds whose share has been hand-marked as paid (the payer's own share is implicit). */
  paidShares: string[]
  createdAt: string
  deleted: boolean
  deletedBy: string | null
  deletedAt: string | null
}

export class ManualLiquidation {
  private constructor(private readonly s: ManualLiquidationSnapshot) {}

  private static validate(concept: string, amount: Money, affects: string[], paidShares: string[]) {
    const c = concept.trim()
    if (c.length < 3 || c.length > 100)
      throw new Error('ManualLiquidation: concept must be 3..100 chars')
    if (amount.cents <= 0) throw new Error('ManualLiquidation: amount must be > 0')
    if (new Set(affects).size !== affects.length)
      throw new Error('ManualLiquidation: affects must contain unique userIds')
    if (new Set(paidShares).size !== paidShares.length)
      throw new Error('ManualLiquidation: paidShares must contain unique userIds')
    if (affects.length > 0) {
      const set = new Set(affects)
      for (const id of paidShares)
        if (!set.has(id))
          throw new Error('ManualLiquidation: paidShares must be a subset of affects')
    }
    return c
  }

  static create(input: {
    concept: string
    amount: Money
    paidBy: string | null
    affects: string[]
  }): ManualLiquidation {
    const concept = ManualLiquidation.validate(input.concept, input.amount, input.affects, [])
    return new ManualLiquidation({
      id: uuidv7(),
      concept,
      cents: input.amount.cents,
      currency: 'EUR',
      paidBy: input.paidBy,
      affects: [...input.affects],
      paidShares: [],
      createdAt: new Date().toISOString(),
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
  }

  static restore(s: ManualLiquidationSnapshot): ManualLiquidation {
    return new ManualLiquidation({
      ...s,
      affects: s.affects ?? [],
      paidShares: s.paidShares ?? [],
      paidBy: s.paidBy ?? null,
      deleted: s.deleted ?? false,
      deletedBy: s.deletedBy ?? null,
      deletedAt: s.deletedAt ?? null,
    })
  }

  edit(input: {
    concept: string
    amount: Money
    paidBy: string | null
    affects: string[]
  }): ManualLiquidation {
    const nextPaidShares = this.s.paidShares.filter(
      (id) => input.affects.length === 0 || input.affects.includes(id),
    )
    const concept = ManualLiquidation.validate(
      input.concept,
      input.amount,
      input.affects,
      nextPaidShares,
    )
    return new ManualLiquidation({
      ...this.s,
      concept,
      cents: input.amount.cents,
      paidBy: input.paidBy,
      affects: [...input.affects],
      paidShares: nextPaidShares,
    })
  }

  toggleShare(userId: string): ManualLiquidation {
    const has = this.s.paidShares.includes(userId)
    return new ManualLiquidation({
      ...this.s,
      paidShares: has
        ? this.s.paidShares.filter((id) => id !== userId)
        : [...this.s.paidShares, userId],
    })
  }

  softDelete(input: { by: string }): ManualLiquidation {
    return new ManualLiquidation({
      ...this.s,
      deleted: true,
      deletedBy: input.by,
      deletedAt: new Date().toISOString(),
    })
  }

  recover(): ManualLiquidation {
    return new ManualLiquidation({ ...this.s, deleted: false, deletedBy: null, deletedAt: null })
  }

  get id(): string {
    return this.s.id
  }
  get concept(): string {
    return this.s.concept
  }

  toSnapshot(): ManualLiquidationSnapshot {
    return { ...this.s, affects: [...this.s.affects], paidShares: [...this.s.paidShares] }
  }
}
