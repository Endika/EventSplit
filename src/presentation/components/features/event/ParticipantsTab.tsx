import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { YouLabel } from '@/presentation/components/common/YouLabel'

export function ParticipantsTab() {
  const { event } = useEventState()
  const me = useCurrentUser()
  if (!event) return null
  return (
    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
      {event.users.map((u) => {
        const isMe = me?.id === u.id
        return (
          <li key={u.id} className={`flex items-center p-3 text-slate-200 ${isMe ? 'bg-violet-900/30' : ''}`}>
            <span>{u.alias ? `${u.name} (${u.alias})` : u.name}</span>
            <YouLabel userId={u.id} />
          </li>
        )
      })}
    </ul>
  )
}
