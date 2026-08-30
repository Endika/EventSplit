import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { coversDay, optionKey, type DayOption } from '@/domain/value-objects/DayOption'
import { dayHeat } from '@/domain/services/availabilityHeat'
import { monthOf } from '@/presentation/utils/calendarMonth'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'
import { MonthGrid } from '@/presentation/components/common/MonthGrid'
import { Button } from '@/presentation/components/common/Button'
import { Modal } from '@/presentation/components/common/Modal'

/** Warm background per heat level. The count is always written too: colour alone never carries it. */
const HEAT_CLASS = ['bg-elevated', 'bg-pos/15', 'bg-pos/30', 'bg-pos/50', 'bg-pos/70'] as const

function todayIso(): string {
  const now = new Date()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/**
 * The month as a heat map of the vote. A day belonging to several overlapping
 * options shows the best one passing through it; tapping it asks which option
 * the vote is for rather than guessing.
 */
export function VotingCalendar(props: {
  options: DayOption[]
  counts: number[]
  totalVoters: number
  myVotes: Record<string, boolean>
  pins: string[]
  onToggleMine: (key: string) => void
  canVote: boolean
}) {
  const { options, counts, totalVoters, myVotes, pins, onToggleMine, canVote } = props
  const { t, i18n } = useTranslation()
  const [month, setMonth] = useState(() => monthOf(options[0]?.start ?? todayIso()))
  const [choose, setChoose] = useState<DayOption[] | null>(null)

  function handleDay(iso: string) {
    if (!canVote) return
    const covering = options.filter((o) => coversDay(o, iso))
    if (covering.length === 0) return
    if (covering.length === 1 && covering[0]) {
      onToggleMine(optionKey(covering[0]))
      return
    }
    setChoose(covering)
  }

  return (
    <div className="space-y-2">
      <MonthGrid
        month={month}
        locale={i18n.language}
        onMonthChange={setMonth}
        labels={{ prev: t('availability.prevMonth'), next: t('availability.nextMonth') }}
        renderDay={(iso, inMonth) => {
          const heat = dayHeat(options, counts, iso, totalVoters)
          const longDate = new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date(iso + 'T00:00:00'))

          if (!heat) {
            return (
              <div
                data-iso={iso}
                data-candidate="false"
                aria-label={`${longDate} — ${t('availability.notCandidate')}`}
                className={`flex h-full min-h-11 w-full items-center justify-center rounded-lg text-sm ${
                  inMonth ? 'text-muted' : 'text-muted/40'
                }`}
              >
                {Number(iso.slice(-2))}
              </div>
            )
          }

          const covering = heat.optionIndexes.flatMap((i) => {
            const o = options[i]
            return o ? [o] : []
          })
          const isChosen = covering.some((o) => pins.includes(optionKey(o)))
          const mine = covering.some((o) => myVotes[optionKey(o)])
          const noted = covering.find((o) => o.note)
          const isStart = covering.some((o) => o.start === iso)
          const isEnd = covering.some((o) => o.end === iso)
          const notePart = noted?.note
            ? ` — ${t('availability.optionHasNote', { note: noted.note })}`
            : ''

          return (
            <button
              type="button"
              data-iso={iso}
              data-candidate="true"
              data-level={heat.level}
              data-mine={mine}
              onClick={() => handleDay(iso)}
              disabled={!canVote}
              title={noted?.note ?? undefined}
              aria-label={`${longDate} — ${t('availability.optionVotes', {
                votes: heat.votes,
                total: totalVoters,
              })}${notePart}`}
              className={[
                'flex h-full min-h-11 w-full flex-col items-center justify-center text-sm',
                HEAT_CLASS[heat.level],
                isStart ? 'rounded-l-lg' : '',
                isEnd ? 'rounded-r-lg' : '',
                covering.every((o) => o.start === o.end) ? 'rounded-lg' : '',
                isChosen ? 'ring-2 ring-brand' : '',
                mine ? 'font-bold text-ink' : 'text-ink',
                inMonth ? '' : 'opacity-60',
              ].join(' ')}
            >
              <span>{Number(iso.slice(-2))}</span>
              <span className="text-[9px] leading-none text-muted">
                {heat.votes}
                {isChosen ? ' 📌' : ''}
                {noted ? ' •' : ''}
              </span>
            </button>
          )
        }}
      />

      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span>{t('availability.legendNobody')}</span>
        {HEAT_CLASS.map((cls, level) => (
          <span key={level} className={`inline-block size-3 rounded ${cls}`} aria-hidden="true" />
        ))}
        <span>{t('availability.legendEveryone')}</span>
      </div>

      {choose && (
        <Modal
          open
          title={t('availability.pickOptionForDay')}
          dismissable
          onClose={() => setChoose(null)}
        >
          <ul className="space-y-2">
            {choose.map((o) => (
              <li key={optionKey(o)}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setChoose(null)
                    onToggleMine(optionKey(o))
                  }}
                >
                  {formatOptionLabel(o, i18n.language)}
                </Button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}
