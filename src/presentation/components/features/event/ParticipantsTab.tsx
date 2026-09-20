import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { Button } from '@/presentation/components/common/Button'
import { IconDog, IconPencil, IconPlus } from '@/presentation/components/common/icons'
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
          <IconPlus className="size-4" />
          {t('participants.add')}
        </Button>
      </div>
      <ul className="border-y border-border">
        {event.users.map((u) => {
          const isMe = me?.id === u.id
          const label = u.alias ? `${u.name} (${u.alias})` : u.name
          // Neutral, not coral: the brand tint already means "this row is me",
          // and a kind is metadata, not state. bg-brand-soft here also failed
          // AA at this size (4.19:1) and vanished on top of my own row.
          const kindBadge =
            u.kind === 'adult' ? null : (
              <span className="ml-2 inline-flex shrink-0 items-center border border-border bg-elevated px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink">
                {u.kind === 'dog' && <IconDog className="mr-1 size-3.5" />}
                {t(u.kind === 'dog' ? 'participants.dog' : 'participants.child')}
              </span>
            )
          return (
            <li
              key={u.id}
              className={`flex min-w-0 items-center border-b border-border last:border-0 ${isMe ? 'bg-brand-soft' : ''}`}
            >
              <button
                type="button"
                className="flex min-h-11 w-full min-w-0 items-center justify-between px-3 py-2 text-left text-ink hover:bg-elevated"
                onClick={() => setEditing(u.id)}
              >
                <span className="flex min-w-0 items-center">
                  <span className="min-w-0 truncate font-semibold">{label}</span>
                  <YouLabel userId={u.id} />
                  {kindBadge}
                </span>
                <IconPencil className="ml-2 size-4 shrink-0 text-muted" />
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
