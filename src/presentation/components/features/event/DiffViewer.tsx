import { useTranslation } from 'react-i18next'
import type { HistoryEntry } from '@/domain/entities/Event'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'

// Privacy: redact sensitive fields when displaying the snapshot
const SENSITIVE_KEYS = ['wifiPassword', 'editPin', 'email', 'phone'] as const

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(k as never)) {
      out[k] = v === null || v === '' ? null : '***'
    } else {
      out[k] = redact(v)
    }
  }
  return out
}

function jsonify(value: unknown): string {
  try {
    return JSON.stringify(redact(value), null, 2)
  } catch {
    return String(value)
  }
}

export function DiffViewer({
  entry,
  onClose,
  onRevert,
}: {
  entry: HistoryEntry
  onClose: () => void
  onRevert?: (entry: HistoryEntry) => void
}) {
  const { t } = useTranslation()
  const hasBefore = entry.before !== null && entry.before !== undefined
  const hasAfter = entry.after !== null && entry.after !== undefined

  return (
    <Modal open title={t(`history.types.${entry.type}`)} dismissable onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-slate-500">
          v{entry.version} · {new Date(entry.timestamp).toLocaleString()}
        </div>
        <div className="text-sm text-slate-200">{entry.description}</div>

        {hasBefore || hasAfter ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs uppercase text-slate-500">{t('history.diff.before')}</div>
              <pre className="max-h-64 overflow-auto rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300">
                {hasBefore ? jsonify(entry.before) : '—'}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase text-slate-500">{t('history.diff.after')}</div>
              <pre className="max-h-64 overflow-auto rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300">
                {hasAfter ? jsonify(entry.after) : '—'}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('history.diff.noChanges')}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {onRevert && entry.fullState && (
            <Button type="button" onClick={() => onRevert(entry)}>
              {t('history.diff.revert')} ↩️
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
