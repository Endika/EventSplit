import type { EventSnapshot } from '@/domain/entities/Event'
import { blankToNull } from '@/presentation/utils/text'

export const newEventInput = (name: string, yourName: string, alias: string) => ({
  name,
  creatorName: yourName,
  creatorAlias: alias || null,
})

export const creatorIdentity = (id: string, yourName: string, alias: string) => ({
  id,
  name: yourName.trim(),
  alias: blankToNull(alias),
})

/** What the cache holds once the creator has set a PIN: one version on, as the server bumped it. */
export const withPinSet = (event: EventSnapshot, version: number) => ({
  snapshot: { ...event, hasPin: true },
  version: version + 1,
})
