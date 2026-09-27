import type { TFunction } from 'i18next'
import {
  ConcurrencyLimitError,
  PayloadTooLargeError,
  RateLimitedError,
  WrongPinError,
} from '@/domain/repositories/IEventRepository'

/**
 * Maps a thrown error to a user-facing, translated message. Known typed errors
 * get a friendly localized string; everything else falls back to the error's
 * own message (domain validation errors are already meaningful) or a generic
 * label for non-Error throwables.
 */
export function friendlyError(err: unknown, t: TFunction): string {
  if (err instanceof ConcurrencyLimitError) return t('errors.concurrency')
  if (err instanceof PayloadTooLargeError) return t('errors.tooLarge')
  if (err instanceof RateLimitedError) return t('pin.tooManyAttempts')
  if (err instanceof WrongPinError) return t('pin.wrongPin')
  if (err instanceof Error) return err.message
  return t('errors.generic')
}
