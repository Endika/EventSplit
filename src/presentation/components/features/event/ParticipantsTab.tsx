import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { Button } from '@/presentation/components/common/Button'
import { ProfileEditor } from './ProfileEditor'
import { AddParticipantModal } from './AddParticipantModal'

export function ParticipantsTab() {
  const { t } = useTranslation()
  const { event } = useEventState()
  const me = useCurrentUser()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  if (!event) return null

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + {t('participants.add')}
        </Button>
      </div>
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
        {event.users.map((u) => {
          const isMe = me?.id === u.id
          const label = u.alias ? `${u.name} (${u.alias})` : u.name
          const kindBadge =
            u.kind === 'child' ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-teal-900/50 px-2 py-0.5 text-xs font-medium text-teal-200">
                {t('participants.child')}
              </span>
            ) : null
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
                    {kindBadge}
                  </span>
                  <span className="text-xs text-slate-400">✎</span>
                </button>
              </li>
            )
          }
          return (
            <li key={u.id} className="flex items-center p-3 text-slate-200">
              <span className="flex items-center">
                {label}
                <YouLabel userId={u.id} />
                {kindBadge}
              </span>
            </li>
          )
        })}
      </ul>
      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
      {adding && <AddParticipantModal onClose={() => setAdding(false)} />}
    </>
  )
}
