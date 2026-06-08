/**
 * Edit-PIN format guard. Hashing and verification now happen server-side (the
 * set_event_pin / verify_event_pin RPCs hash with a salt in a SECURITY DEFINER
 * function); the plaintext and the hash never live in the client snapshot.
 */
export class EditPin {
  static validateFormat(pin: string): void {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('EditPin: must be 4-6 digits')
  }
}
