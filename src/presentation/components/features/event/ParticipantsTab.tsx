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
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  if (!event) return null

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + {t('participants.add')}
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {event.users.map((u) => {
          const isMe = me?.id === u.id
          const label = u.alias ? `${u.name} (${u.alias})` : u.name
          const kindBadge =
            u.kind === 'child' ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-soft-fg">
                {t('participants.child')}
              </span>
            ) : null
          return (
            <li key={u.id} className={`flex items-center ${isMe ? 'bg-brand-soft' : ''}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between p-3 text-left text-ink hover:bg-elevated"
                onClick={() => setEditing(u.id)}
              >
                <span className="flex items-center">
                  {label}
                  <YouLabel userId={u.id} />
                  {kindBadge}
                </span>
                <span className="text-xs text-muted">✎</span>
              </button>
            </li>
          )
        })}
      </ul>
      {editing && <ProfileEditor userId={editing} onClose={() => setEditing(null)} />}
      {adding && <AddParticipantModal onClose={() => setAdding(false)} />}
    </>
  )
}
