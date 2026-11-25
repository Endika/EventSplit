import type { EventSnapshot } from '@/domain/entities/Event'
import type { UserSnapshot } from '@/domain/entities/User'
import { matchDuplicate, type CloneSelection } from '@/domain/services/buildClonePatch'

export type SiteField = keyof CloneSelection['site']

export function isEmptySelection(selection: CloneSelection): boolean {
  return (
    !selection.dayOptions &&
    selection.userIds.length === 0 &&
    selection.purchaseIds.length === 0 &&
    !Object.values(selection.site).some(Boolean)
  )
}

/** The merge ids with one person added or dropped. */
export const withMerge = (mergeIds: string[], id: string, merge: boolean): string[] =>
  merge ? [...new Set([...mergeIds, id])] : mergeIds.filter((x) => x !== id)

/** Who in the source already has a namesake in the target. */
export const duplicateUserIds = (
  sourceUsers: readonly UserSnapshot[],
  targetUsers: readonly UserSnapshot[],
): Set<string> =>
  new Set(sourceUsers.filter((u) => matchDuplicate(u.name, targetUsers)).map((u) => u.id))

/** Diet and allergies of a person, as one line. */
export const userDetails = (u: Pick<UserSnapshot, 'dietary' | 'allergies'>): string =>
  [u.dietary, u.allergies.map((a) => a.name).join(', ')].filter(Boolean).join(' · ')

/** Which site fields the source has anything in. */
export const presentSiteFields = (
  source: Pick<EventSnapshot, 'location' | 'emergencyContact' | 'wifiPassword' | 'generalNotes'>,
): Record<SiteField, boolean> => ({
  location: source.location !== null,
  emergencyContact: Boolean(source.emergencyContact),
  wifiPassword: Boolean(source.wifiPassword),
  generalNotes: Boolean(source.generalNotes),
})

/** All present site fields on, or all off. */
export const siteSelection = (
  present: Record<SiteField, boolean>,
  on: boolean,
): CloneSelection['site'] => ({
  location: on && present.location,
  emergencyContact: on && present.emergencyContact,
  wifiPassword: on && present.wifiPassword,
  generalNotes: on && present.generalNotes,
})

export function formatSourceDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}
