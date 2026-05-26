import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import type { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Button } from '@/presentation/components/common/Button'
import { Input } from '@/presentation/components/common/Input'
import { useOnlineStatus } from '@/presentation/context/SyncContext'

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const online = useOnlineStatus()
  const [paidBy, setPaidBy] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!event) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!event) return
    setBusy(true)
    setError(null)
    try {
      const handler = container.resolve<AddExpenseHandler>('addExpense')
      const result = await handler.execute({
        eventId: event.id,
        paidBy,
        amountEuros: parseFloat(amount),
        description,
      })
      container
        .resolve<LocalStorageCache>('cache')
        .set(event.id, { snapshot: result.event, version: result.version })
      setEvent(result.event, result.version)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <label className="block text-sm text-slate-300">
        {t('expenses.form.paidBy')}
        <select
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
          required
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          <option value="" disabled>—</option>
          {event.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.alias ? `${u.name} (${u.alias})` : u.name}
            </option>
          ))}
        </select>
      </label>
      <Input
        type="number"
        min="0.01"
        max="999999.99"
        step="0.01"
        placeholder={t('expenses.form.amount')}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <Input
        placeholder={t('expenses.form.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        minLength={3}
        maxLength={100}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onDone} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={busy || !online || !paidBy || !amount}>
          {t('expenses.form.submit')}
        </Button>
      </div>
    </form>
  )
}
