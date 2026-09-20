import i18n from '@/presentation/i18n/config'

/**
 * A quantity in the language the app is speaking. Money went through Intl and
 * these did not, so a Spanish shopping list printed `1.5 kg` next to `240,00 €`
 * on the same screen — two notations for numbers, one of them borrowed.
 */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(value)
}
