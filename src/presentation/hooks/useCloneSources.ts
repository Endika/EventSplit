import { useMemo } from 'react'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'

export type CloneSource = {
  id: string
  name: string
  updatedAt: string
  participantCount: number
}

/**
 * Events we can clone from: the ones cached locally where I have an identity,
 * so I am a participant. PIN-protected events are left out entirely — reading
 * one needs the PIN, and half a clone is worse than none.
 */
export function useCloneSources(excludeEventId: string): CloneSource[] {
  return useMemo(() => {
    try {
      const cache = new LocalStorageCache()
      return cache
        .listAll()
        .filter((summary) => {
          if (summary.id === excludeEventId) return false
          if (!cache.getIdentity(summary.id)) return false
          return cache.get(summary.id)?.snapshot.hasPin !== true
        })
        .map(({ id, name, updatedAt, participantCount }) => ({
          id,
          name,
          updatedAt,
          participantCount,
        }))
    } catch {
      // Private window, blocked storage: nothing to offer rather than a crash.
      return []
    }
  }, [excludeEventId])
}
