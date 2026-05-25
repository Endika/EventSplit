import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { YouLabel } from '@/presentation/components/common/YouLabel'

export function ParticipantsTab() {
  const { event } = useEventState()
  const me = useCurrentUser()
  if (!event) return null
  return (
    <ul className="divide-y rounded-lg border">
      {event.users.map((u) => {
        const isMe = me?.id === u.id
        return (
          <li key={u.id} className={`flex items-center p-3 ${isMe ? 'bg-amber-50' : ''}`}>
            <span>{u.alias ? `${u.name} (${u.alias})` : u.name}</span>
            <YouLabel userId={u.id} />
          </li>
        )
      })}
    </ul>
  )
}
