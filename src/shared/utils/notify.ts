export interface Notice {
  /** i18n key resolved by the NoticeBanner. */
  key: string
  at: number
}

export const NOTICE_EVENT = 'eventsplit:notice'

/**
 * Dispatch a transient, non-error notice (e.g. "someone else just edited").
 * Surfaced on screen by the global NoticeBanner, which auto-dismisses it.
 */
export function notify(key: string): void {
  window.dispatchEvent(new CustomEvent<Notice>(NOTICE_EVENT, { detail: { key, at: Date.now() } }))
}
