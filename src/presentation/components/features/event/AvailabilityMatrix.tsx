import { useTranslation } from 'react-i18next'
import { optionKey, type DayOption } from '@/domain/value-objects/DayOption'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'
import { YouLabel } from '@/presentation/components/common/YouLabel'

type MatrixUser = { id: string; name: string; alias: string | null }

/**
 * Who can make which option. It shows a column per option but not every option:
 * with up to 31 on offer the table would be unreadable, so the caller passes the
 * ones that matter (chosen plus most voted) and how many are left out.
 */
export function AvailabilityMatrix(props: {
  users: MatrixUser[]
  options: DayOption[]
  optionIndexes: number[]
  hiddenCount: number
  pins: string[]
  meId: string | null
  removableKeys: string[]
  voteOf: (userId: string, key: string) => boolean
  onVote: (userId: string, key: string, value: boolean) => void
  onTogglePin: (key: string) => void
  onRemove: (key: string) => void
  busy: boolean
}) {
  const { t, i18n } = useTranslation()
  const {
    users,
    options,
    optionIndexes,
    hiddenCount,
    pins,
    meId,
    removableKeys,
    voteOf,
    onVote,
    onTogglePin,
    onRemove,
    busy,
  } = props

  const shown = optionIndexes.flatMap((i) => {
    const o = options[i]
    return o ? [{ option: o, key: optionKey(o) }] : []
  })

  return (
    <div className="space-y-2">
      <div data-no-swipe className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="p-3 text-left">&nbsp;</th>
              {shown.map(({ option, key }) => {
                const isChosen = pins.includes(key)
                return (
                  <th
                    key={key}
                    className={`p-3 text-center font-medium ${
                      isChosen ? 'bg-brand-soft text-brand-soft-fg' : 'text-ink'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onTogglePin(key)}
                        className="flex flex-col items-center gap-0.5"
                        title={t('availability.pickDay')}
                        aria-pressed={isChosen}
                      >
                        <span>{formatOptionLabel(option, i18n.language)}</span>
                        <span className={isChosen ? 'text-brand' : 'text-muted'}>📌</span>
                      </button>
                      {option.note && (
                        <span
                          className="max-w-24 truncate text-[10px] normal-case text-muted"
                          title={option.note}
                        >
                          {option.note}
                        </span>
                      )}
                      {removableKeys.includes(key) && (
                        <button
                          type="button"
                          onClick={() => onRemove(key)}
                          disabled={busy}
                          className="mt-1 inline-flex min-h-11 min-w-11 items-center justify-center text-[10px] text-muted hover:text-danger"
                          title={t('availability.removeDay')}
                          aria-label={t('availability.removeDay')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={meId === u.id ? 'bg-brand-soft/30' : ''}>
                <td className="p-3 text-ink">
                  {u.alias ? `${u.name} (${u.alias})` : u.name}
                  <YouLabel userId={u.id} />
                </td>
                {shown.map(({ option, key }) => (
                  <td
                    key={key}
                    className={`p-0 text-center ${pins.includes(key) ? 'bg-brand-soft/20' : ''}`}
                  >
                    <label className="flex h-full w-full cursor-pointer items-center justify-center p-3">
                      <input
                        type="checkbox"
                        checked={voteOf(u.id, key)}
                        onChange={(e) => onVote(u.id, key, e.target.checked)}
                        disabled={busy}
                        className="size-4 rounded border-border bg-elevated accent-brand"
                        aria-label={`${u.name} ${formatOptionLabel(option, i18n.language)}`}
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border text-xs text-muted">
              <td className="p-3 font-medium">{t('availability.votes')}</td>
              {shown.map(({ key }) => {
                const count = users.reduce((n, u) => n + (voteOf(u.id, key) ? 1 : 0), 0)
                return (
                  <td
                    key={key}
                    className={`p-3 text-center ${pins.includes(key) ? 'bg-brand-soft/20' : ''}`}
                  >
                    <span className="font-semibold text-pos">{count}</span>
                    <span className="text-muted">/{users.length}</span>
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {hiddenCount > 0 && (
        <p className="text-xs text-muted">
          {t('availability.hiddenOptions', { count: hiddenCount })}
        </p>
      )}
    </div>
  )
}
