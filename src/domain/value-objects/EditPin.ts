const SALT_SUFFIX = 'eventsplit-v1'

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export class EditPin {
  static validateFormat(pin: string): void {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('EditPin: must be 4-6 digits')
  }

  static async hash(pin: string, eventId: string): Promise<string> {
    EditPin.validateFormat(pin)
    return sha256(`${pin}|${eventId}|${SALT_SUFFIX}`)
  }

  static async verify(pin: string, expectedHash: string, eventId: string): Promise<boolean> {
    if (!/^\d{4,6}$/.test(pin)) return false
    const actual = await sha256(`${pin}|${eventId}|${SALT_SUFFIX}`)
    return actual === expectedHash
  }
}
