/**
 * Outbound port for fan-out of event changes. Carries only the version number,
 * never the snapshot, so a change notification costs a few bytes instead of the
 * whole event. Subscribers decide whether the new version is worth fetching.
 */
export interface IEventChangeNotifier {
  /** Notify every subscriber of `eventId` that a new version exists. Best-effort. */
  publish(eventId: string, version: number): void
  /** Listen for new versions of `eventId`. Returns an unsubscribe function. */
  subscribe(eventId: string, onVersion: (version: number) => void): () => void
}
