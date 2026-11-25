import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { displayUnit, type Translate } from '@/presentation/utils/units'
import { groupPurchases } from '@/presentation/utils/groupPurchases'
import { boughtQuantity, isPurchaseDone } from '@/presentation/utils/purchaseProgress'

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

function strike(s: string): string {
  return [...s].map((ch) => ch + '̶').join('')
}

function nameOf(event: EventSnapshot, userId: string | null): string | null {
  return event.users.find((u) => u.id === userId)?.name ?? null
}

function renderBuyLine(event: EventSnapshot, p: PurchaseSnapshot, t: Translate): string {
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

export function formatShoppingListText(event: EventSnapshot, t: Translate): string {
  const visible = event.purchases.filter((p) => !p.deleted)
  if (visible.length === 0) return ''

  const buys = visible.filter((p) => p.kind === 'buy')
  const brings = visible.filter((p) => p.kind === 'bring')

  const blocks: string[][] = [[t('share.format.header', { eventName: event.name })]]

  for (const g of groupPurchases(event, buys)) {
    const groupLabel = g.group === '' ? t('share.format.noGroup') : g.group
    const lines = [`📌 ${groupLabel}`]
    for (const sg of g.subgroups) {
      if (sg.subgroup !== '') {
        lines.push(`  └ ${sg.subgroup}`)
      }
      for (const item of sg.items) {
        lines.push(renderBuyLine(event, item, t))
      }
    }
    blocks.push(lines)
  }

  if (brings.length > 0) {
    blocks.push([t('share.format.broughtSection'), ...brings.map((p) => renderBringLine(event, p))])
  }

  return blocks.map((lines) => lines.join('\n')).join('\n\n')
}
