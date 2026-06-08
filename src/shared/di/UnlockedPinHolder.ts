/**
 * Process-wide holder for the edit PIN unlocked at the gate. Registered as a DI
 * singleton so the repository layer can read the current session PIN without
 * threading it through all ~28 collaborative write handler signatures.
 *
 * The React {@link EditPinProvider} state remains the source for re-rendering
 * gated UI; this holder is the source the repository decorator
 * ({@link PinForwardingEventRepository}) reads when a caller passes a null PIN.
 */
export class UnlockedPinHolder {
  private pin: string | null = null

  get(): string | null {
    return this.pin
  }

  set(pin: string | null): void {
    this.pin = pin
  }
}
