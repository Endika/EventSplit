import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { displayUnit } from '@/presentation/utils/units'
import { groupPurchases } from '@/presentation/utils/groupPurchases'
import { boughtQuantity, isPurchaseDone } from '@/presentation/utils/purchaseProgress'
type T = (key: string, vars?: Record<string, unknown>) => string

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

function strike(s: string): string {
  return [...s].map((ch) => ch + '̶').join('')
}

function nameOf(event: EventSnapshot, userId: string | null): string | null {
  if (!userId) return null
  return event.users.find((u) => u.id === userId)?.name ?? null
}

function renderBuyLine(event: EventSnapshot, p: PurchaseSnapshot, t: T): string {
  const assigned = nameOf(event, p.assignedTo)
  const assigneePart = assigned ? ` — ${assigned}` : ''
  const done = isPurchaseDone(event, p)
  const name = done ? strike(p.item) : p.item
  const checkmark = done ? ' ✅' : ''
  const bought = boughtQuantity(event, p.id)
  const total = p.totalQuantity
  const unit = displayUnit(p.unit, t, total)
  return `     • ${name}${assigneePart} · ${formatQty(bought)}/${formatQty(total)} ${unit}${checkmark}`
}

function renderBringLine(event: EventSnapshot, p: PurchaseSnapshot): string {
  const assigned = nameOf(event, p.assignedTo)
  const assigneePart = assigned ? ` — ${assigned}` : ''
  return `  • ${p.item}${assigneePart}`
}

export function formatShoppingListText(event: EventSnapshot, t: T): string {
  const visible = event.purchases.filter((p) => !p.deleted)
  if (visible.length === 0) return ''

  const buys = visible.filter((p) => p.kind === 'buy')
  const brings = visible.filter((p) => p.kind === 'bring')

  const lines: string[] = []
  lines.push(t('share.format.header', { eventName: event.name }))
  lines.push('')

  for (const g of groupPurchases(event, buys)) {
    const groupLabel = g.group === '' ? t('share.format.noGroup') : g.group
    lines.push(`📌 ${groupLabel}`)
    for (const sg of g.subgroups) {
      if (sg.subgroup !== '') {
        lines.push(`  └ ${sg.subgroup}`)
      }
      for (const item of sg.items) {
        lines.push(renderBuyLine(event, item, t))
      }
    }
    lines.push('')
  }

  if (brings.length > 0) {
    lines.push(t('share.format.broughtSection'))
    for (const item of brings) {
      lines.push(renderBringLine(event, item))
    }
  }

  return lines.join('\n').replace(/\n+$/, '')
}
