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
  const detail: ReportedError = {
    context,
    name: err instanceof Error ? err.constructor.name : 'Error',
    message: err instanceof Error ? err.message : String(err),
    at: Date.now(),
  }
  window.dispatchEvent(new CustomEvent<ReportedError>(ERROR_EVENT, { detail }))
}
