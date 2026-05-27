export const STALE_CLIENT_EVENT = 'eventsplit:stale-client'

/**
 * True when an error signals that this client runs an older schema than the
 * server accepts (StaleClientError, raised from the events guard trigger).
 * Duck-typed on a stable discriminant so it survives production minification,
 * where class names are mangled.
 */
export function isStaleClientError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'STALE_CLIENT'
  )
}
