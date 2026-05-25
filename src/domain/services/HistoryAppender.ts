import type { EventSnapshot, HistoryType } from '@/domain/entities/Event'

export const HistoryAppender = {
  append(
    snapshot: EventSnapshot,
    input: { type: HistoryType; userId: string; description: string; before: unknown; after: unknown },
  ): EventSnapshot {
    const nextVersion = (snapshot.history.at(-1)?.version ?? 0) + 1
    const now = new Date().toISOString()
    return {
      ...snapshot,
      updatedAt: now,
      history: [
        ...snapshot.history,
        {
          id: crypto.randomUUID(),
          version: nextVersion,
          timestamp: now,
          type: input.type,
          userId: input.userId,
          description: input.description,
          before: input.before,
          after: input.after,
        },
      ],
    }
  },
}
