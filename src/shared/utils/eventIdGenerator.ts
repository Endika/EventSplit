const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateEventId(): string {
  const bytes = new Uint8Array(7)
  crypto.getRandomValues(bytes)
  let s = ''
  for (let i = 0; i < 7; i++) s += ALPHABET[bytes[i]! % 36]
  return s
}
