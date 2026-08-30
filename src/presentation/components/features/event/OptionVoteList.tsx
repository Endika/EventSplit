import { useTranslation } from 'react-i18next'
import {
  MAX_NOTE_LEN,
  normalizeNote,
  optionKey,
  type DayOption,
} from '@/domain/value-objects/DayOption'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'

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
    <ul className="space-y-2">
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
            className={`rounded-xl border bg-surface p-3 ${
              chosen ? 'border-brand ring-1 ring-brand' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={myVotes[key] ?? false}
                onChange={() => onToggleMine(key)}
                disabled={!canVote}
                aria-label={t('availability.myVote', { label })}
                className="size-5 rounded border-border bg-elevated accent-brand"
              />
              <span className="flex-1 text-sm font-medium text-ink">{label}</span>
              <span className="text-xs text-muted">
                <span className="font-semibold text-pos">{votes}</span>
                <span>/{totalVoters}</span>
              </span>
              <button
                type="button"
                onClick={() => onTogglePin(key)}
                aria-pressed={chosen}
                aria-label={t('availability.chosenOption')}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
                  chosen ? 'text-brand' : 'text-muted hover:text-ink'
                }`}
              >
                📌
              </button>
            </div>
            <input
              type="text"
              defaultValue={notes[key] ?? option.note ?? ''}
              onBlur={(e) => onSetNote(key, normalizeNote(e.target.value))}
              maxLength={MAX_NOTE_LEN}
              placeholder={t('availability.optionNotePlaceholder')}
              aria-label={t('availability.optionNoteAria', { label })}
              className="mt-2 w-full rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-ink placeholder-muted focus:border-brand focus:outline-none"
            />
          </li>
        )
      })}
    </ul>
  )
}
