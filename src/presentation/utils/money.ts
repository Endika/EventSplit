import i18n from '@/presentation/i18n/config'

/**
 * Money, in the language the app is actually speaking.
 *
 * Four copies of `(cents / 100).toFixed(2)` with a hand-written `€` in front of
 * them used to print `€240.00` and `€-33.16` in all six locales — the minus
 * between the symbol and the figure — while the amount field happily accepted
 * `12,50`. The app asked for money in one notation and answered in another.
 */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

/** The same amount with an explicit `+` when it is owed to you. */
export function formatSignedMoney(cents: number): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    signDisplay: 'exceptZero',
  }).format(cents / 100)
}
