import { useTranslation } from 'react-i18next'
import {
  MAX_NOTE_LEN,
  normalizeNote,
  optionKey,
  type DayOption,
} from '@/domain/value-objects/DayOption'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'
import { IconPin } from '@/presentation/components/common/icons'

/**
 * The voting surface. Options may overlap, so a day does not identify one —
 * the list does, one row per option, with its own note and vote count.
 */
export function OptionVoteList(props: {
  options: DayOption[]
  counts: number[]
  totalVoters: number
  myVotes: Record<string, boolean>
  pins: string[]
  notes: Record<string, string | null>
  onToggleMine: (key: string) => void
  onTogglePin: (key: string) => void
  onSetNote: (key: string, note: string | null) => void
  canVote: boolean
}) {
  const {
    options,
    counts,
    totalVoters,
    myVotes,
    pins,
    notes,
    onToggleMine,
    onTogglePin,
    onSetNote,
    canVote,
  } = props
  const { t, i18n } = useTranslation()

  return (
    <ul className="border-t border-border">
      {options.map((option, i) => {
        const key = optionKey(option)
        const label = formatOptionLabel(option, i18n.language)
        const chosen = pins.includes(key)
        const votes = counts[i] ?? 0
        return (
          <li
            key={key}
            data-chosen={chosen}
            data-option={key}
            className={`border-b border-border px-2 py-1 ${chosen ? 'bg-brand-soft' : ''}`}
          >
            <div className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={myVotes[key] ?? false}
                onChange={() => onToggleMine(key)}
                disabled={!canVote}
                aria-label={t('availability.myVote', { label })}
                className="size-5 shrink-0 border-border bg-elevated accent-brand"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {label}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="text-base font-semibold text-pos">{votes}</span>
                <span className="text-sm text-muted">/{totalVoters}</span>
              </span>
              <button
                type="button"
                onClick={() => onTogglePin(key)}
                aria-pressed={chosen}
                aria-label={t('availability.chosenOption')}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center ${
                  chosen ? 'text-brand' : 'text-muted hover:text-ink'
                }`}
              >
                <IconPin className="size-4" />
              </button>
            </div>
            <input
              type="text"
              defaultValue={notes[key] ?? option.note ?? ''}
              onBlur={(e) => onSetNote(key, normalizeNote(e.target.value))}
              maxLength={MAX_NOTE_LEN}
              placeholder={t('availability.optionNotePlaceholder')}
              aria-label={t('availability.optionNoteAria', { label })}
              className="mb-1 min-h-11 w-full border border-border bg-elevated px-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none sm:text-sm"
            />
          </li>
        )
      })}
    </ul>
  )
}
