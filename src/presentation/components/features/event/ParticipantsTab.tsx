import { useState } from 'react'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { ProfileEditor } from './ProfileEditor'

export function ParticipantsTab() {
  const { event } = useEventState()
  const me = useCurrentUser()
  const [editing, setEditing] = useState(false)
  if (!event) return null
  return (
    <>
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
        {event.users.map((u) => {
          const isMe = me?.id === u.id
          const label = u.alias ? `${u.name} (${u.alias})` : u.name
          if (isMe) {
            return (
              <li key={u.id} className="flex items-center bg-violet-900/30">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left text-slate-200 hover:bg-violet-900/50"
                  onClick={() => setEditing(true)}
                >
                  <span className="flex items-center">
                    {label}
                    <YouLabel userId={u.id} />
                  </span>
                  <span className="text-xs text-slate-400">✎</span>
                </button>
              </li>
            )
          }
          return (
            <li key={u.id} className="flex items-center p-3 text-slate-200">
              <span>{label}</span>
              <YouLabel userId={u.id} />
            </li>
          )
        })}
      </ul>
      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
    </>
  )
}
