const MIN_PIN_LENGTH = 4
const MAX_PIN_LENGTH = 6

export const isValidPinLength = (pin: string): boolean =>
  pin.length >= MIN_PIN_LENGTH && pin.length <= MAX_PIN_LENGTH

export const hasMinPinLength = (pin: string): boolean => pin.length >= MIN_PIN_LENGTH

export const digitsOnly = (raw: string): string => raw.replace(/\D/g, '')
