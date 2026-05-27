import { STALE_CLIENT_EVENT, isStaleClientError } from './staleClient'

export interface ReportedError {
  context: string
  name: string
  message: string
  at: number
}

export const ERROR_EVENT = 'eventsplit:error'

/**
 * Log an error to the console AND dispatch a window event so the global
 * ErrorBanner can surface it on screen (critical for mobile where devtools
 * are not accessible).
 */
export function reportError(context: string, err: unknown): void {
  console.error(`[${context}]`, err)
  if (isStaleClientError(err)) {
    // Don't show the generic red error banner — the UpdateBanner shows a
    // dedicated "please update" prompt with an action button instead.
    window.dispatchEvent(new Event(STALE_CLIENT_EVENT))
    return
  }
  const detail: ReportedError = {
    context,
    name: err instanceof Error ? err.constructor.name : 'Error',
    message: err instanceof Error ? err.message : String(err),
    at: Date.now(),
  }
  window.dispatchEvent(new CustomEvent<ReportedError>(ERROR_EVENT, { detail }))
}
