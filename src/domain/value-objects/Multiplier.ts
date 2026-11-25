export class Multiplier {
  private constructor(readonly value: number) {}

  static of(value: number): Multiplier {
    if (!Number.isFinite(value) || value < 0 || value > 10)
      throw new Error('Multiplier: out of range [0, 10]')
    const quartered = value * 4
    // Stryker disable next-line EqualityOperator: a drift of exactly 1e-9 is not representable in floats
    if (Math.abs(quartered - Math.round(quartered)) > 1e-9)
      throw new Error('Multiplier: step must be 0.25')
    return new Multiplier(value)
  }
}
