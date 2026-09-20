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
          // Neutral, not coral: the brand tint already means "this row is me",
          // and a kind is metadata, not state. bg-brand-soft here also failed
          // AA at this size (4.19:1) and vanished on top of my own row.
          const kindBadge =
            u.kind === 'adult' ? null : (
              <span className="ml-2 inline-flex shrink-0 items-center rounded-full bg-elevated px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-border">
                {u.kind === 'dog' && <span aria-hidden="true">🐕&nbsp;</span>}
                {t(u.kind === 'dog' ? 'participants.dog' : 'participants.child')}
              </span>
            )
          return (
            <li key={u.id} className={`flex min-w-0 items-center ${isMe ? 'bg-brand-soft' : ''}`}>
              <button
                type="button"
                className="flex w-full min-w-0 items-center justify-between p-3 text-left text-ink hover:bg-elevated"
                onClick={() => setEditing(u.id)}
              >
                <span className="flex min-w-0 items-center">
                  <span className="min-w-0 truncate">{label}</span>
                  <YouLabel userId={u.id} />
                  {kindBadge}
                </span>
                <span className="ml-2 shrink-0 text-xs text-muted">✎</span>
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
