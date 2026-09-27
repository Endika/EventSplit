export const PIN_KEY = (eventId: string) => `eventsplit.pin.${eventId}`

/**
 * Per-event holder for the edit PIN unlocked at the gate, remembered on this
 * device in localStorage so a reload or a new tab doesn't lock the user out of
 * an event whose reads are PIN-gated. Registered as a DI singleton so the
 * repository layer can read it without threading it through all ~28
 * collaborative write handler signatures.
 *
 * The React {@link EditPinProvider} re-renders gated UI on changes; this holder
 * is the source the repository decorator ({@link PinForwardingEventRepository})
 * reads when a caller passes a null PIN.
 */
export class UnlockedPinHolder {
  get(eventId: string): string | null {
    return localStorage.getItem(PIN_KEY(eventId))
  }

  set(eventId: string, pin: string | null): void {
    if (pin === null) localStorage.removeItem(PIN_KEY(eventId))
    else localStorage.setItem(PIN_KEY(eventId), pin)
  }
}
