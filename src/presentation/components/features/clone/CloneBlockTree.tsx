import { useTranslation } from 'react-i18next'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { CloneSelection } from '@/domain/services/buildClonePatch'
import { groupPurchases } from '@/presentation/utils/groupPurchases'
import {
  parentState,
  toggleGroup,
  toggleOne,
  type TriState,
} from '@/presentation/utils/checkboxTree'

type SiteField = keyof CloneSelection['site']

function TriCheckbox(props: {
  state: TriState
  label: string
  hint?: string
  onToggle: (on: boolean) => void
  bold?: boolean
}) {
  const { state, label, hint, onToggle, bold } = props
  return (
    <label className="flex min-h-11 items-start gap-2 py-1">
      <input
        type="checkbox"
        checked={state === 'on'}
        // indeterminate is not a JSX attribute; it only exists on the node.
        ref={(el) => {
          if (el) el.indeterminate = state === 'mixed'
        }}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={label}
        className="mt-1 size-4 shrink-0 rounded border-border bg-elevated accent-brand"
      />
      <span className="min-w-0">
        <span className={`block text-sm ${bold ? 'font-semibold text-ink' : 'text-ink'}`}>
          {label}
        </span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  )
}

/**
 * What to bring over, ticked block by block. The shopping list goes three deep
 * — everything / a group / one item — with each parent reflecting its children.
 */
export function CloneBlockTree(props: {
  source: EventSnapshot
  target: EventSnapshot
  selection: CloneSelection
  onChange: (next: CloneSelection) => void
}) {
  const { source, target, selection, onChange } = props
  const { t } = useTranslation()

  const liveItems = source.purchases.filter((p) => !p.deleted)
  const groups = groupPurchases(source, liveItems)
  const picked = (id: string) => selection.purchaseIds.includes(id)
  const takenNames = new Set(target.users.map((u) => u.name.trim().toLowerCase()))

  const siteFields: { key: SiteField; label: string; present: boolean }[] = [
    { key: 'location', label: t('clone.fieldLocation'), present: source.location !== null },
    {
      key: 'emergencyContact',
      label: t('clone.fieldEmergency'),
      present: Boolean(source.emergencyContact),
    },
    { key: 'wifiPassword', label: t('clone.fieldWifi'), present: Boolean(source.wifiPassword) },
    { key: 'generalNotes', label: t('clone.fieldNotes'), present: Boolean(source.generalNotes) },
  ]
  const availableSite = siteFields.filter((f) => f.present)

  return (
    <div className="space-y-4">
      {source.dayOptions.length > 0 && (
        <section>
          <TriCheckbox
            bold
            state={selection.dayOptions ? 'on' : 'off'}
            label={t('clone.blockDays')}
            hint={t('clone.noVotes')}
            onToggle={(on) => onChange({ ...selection, dayOptions: on })}
          />
        </section>
      )}

      {source.users.length > 0 && (
        <section>
          <TriCheckbox
            bold
            state={parentState(source.users.map((u) => selection.userIds.includes(u.id)))}
            label={t('clone.blockUsers')}
            onToggle={(on) =>
              onChange({
                ...selection,
                userIds: toggleGroup(
                  source.users.map((u) => u.id),
                  selection.userIds,
                  on,
                ),
              })
            }
          />
          <ul className="ml-6">
            {source.users.map((u) => {
              const duplicate = takenNames.has(u.name.trim().toLowerCase())
              const details = [u.dietary, u.allergies.map((a) => a.name).join(', ')]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={u.id} data-user={u.id} data-duplicate={duplicate}>
                  <TriCheckbox
                    state={selection.userIds.includes(u.id) ? 'on' : 'off'}
                    label={u.alias ? `${u.name} (${u.alias})` : u.name}
                    hint={duplicate ? t('clone.duplicateName') : details || undefined}
                    onToggle={() =>
                      onChange({ ...selection, userIds: toggleOne(u.id, selection.userIds) })
                    }
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {liveItems.length > 0 && (
        <section>
          <TriCheckbox
            bold
            state={parentState(liveItems.map((p) => picked(p.id)))}
            label={t('clone.blockPurchases')}
            hint={t('clone.cleanList')}
            onToggle={(on) =>
              onChange({
                ...selection,
                purchaseIds: toggleGroup(
                  liveItems.map((p) => p.id),
                  selection.purchaseIds,
                  on,
                ),
              })
            }
          />
          <div className="ml-6 space-y-2">
            {groups.map((g) => (
              <div key={g.group || 'ungrouped'} data-group={g.group || 'ungrouped'}>
                {g.group && (
                  <TriCheckbox
                    state={parentState(g.items.map((p) => picked(p.id)))}
                    label={g.group}
                    onToggle={(on) =>
                      onChange({
                        ...selection,
                        purchaseIds: toggleGroup(
                          g.items.map((p) => p.id),
                          selection.purchaseIds,
                          on,
                        ),
                      })
                    }
                  />
                )}
                <ul className={g.group ? 'ml-6' : ''}>
                  {g.items.map((p) => (
                    <li key={p.id} data-item={p.id}>
                      <TriCheckbox
                        state={picked(p.id) ? 'on' : 'off'}
                        label={p.item}
                        onToggle={() =>
                          onChange({
                            ...selection,
                            purchaseIds: toggleOne(p.id, selection.purchaseIds),
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {availableSite.length > 0 && (
        <section>
          <TriCheckbox
            bold
            state={parentState(availableSite.map((f) => selection.site[f.key]))}
            label={t('clone.blockSite')}
            onToggle={(on) =>
              onChange({
                ...selection,
                site: {
                  location: on && siteFields[0]!.present,
                  emergencyContact: on && siteFields[1]!.present,
                  wifiPassword: on && siteFields[2]!.present,
                  generalNotes: on && siteFields[3]!.present,
                },
              })
            }
          />
          <ul className="ml-6">
            {availableSite.map((f) => (
              <li key={f.key} data-field={f.key}>
                <TriCheckbox
                  state={selection.site[f.key] ? 'on' : 'off'}
                  label={f.label}
                  onToggle={(on) =>
                    onChange({ ...selection, site: { ...selection.site, [f.key]: on } })
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
