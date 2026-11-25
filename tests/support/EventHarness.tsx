import { useEffect, type ReactNode } from 'react'
import { useEventState } from '@/presentation/context/EventContext'
import { useSetCurrentUser } from '@/presentation/context/UserContext'
import type { EventSnapshot } from '@/domain/entities/Event'

export function Init({ event, meId }: { event: EventSnapshot; meId: string }) {
  const { setEvent } = useEventState()
  const setUser = useSetCurrentUser()
  useEffect(() => {
    const me = event.users.find((u) => u.id === meId)!
    setEvent(event, 1)
    setUser({ id: me.id, name: me.name, alias: me.alias, displayName: me.name })
  }, [event, meId, setEvent, setUser])
  return null
}

export function WhenLoaded({ children }: { children: ReactNode }) {
  const { event } = useEventState()
  return event ? <>{children}</> : null
}
