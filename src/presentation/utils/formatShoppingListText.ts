import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import { displayUnit } from '@/presentation/utils/units'
type T = (key: string, vars?: Record<string, string>) => string

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

function strike(s: string): string {
  return [...s].map((ch) => ch + '̶').join('')
}

function boughtQtyFor(event: EventSnapshot, purchaseId: string): number {
  return event.expenses
    .filter((e) => !e.deleted)
    .reduce(
      (sum, e) =>
        sum + ((e.purchaseLinks ?? []).find((l) => l.purchaseId === purchaseId)?.quantity ?? 0),
      0,
    )
}

function nameOf(event: EventSnapshot, userId: string | null): string | null {
  if (!userId) return null
  return event.users.find((u) => u.id === userId)?.name ?? null
}

function renderBuyLine(event: EventSnapshot, p: PurchaseSnapshot, t: T): string {
  const assigned = nameOf(event, p.assignedTo)
  const assigneePart = assigned ? ` — ${assigned}` : ''
  const name = p.purchased ? strike(p.item) : p.item
  const checkmark = p.purchased ? ' ✅' : ''
  const bought = boughtQtyFor(event, p.id)
  const total = p.totalQuantity
  const unit = displayUnit(p.unit, t)
  return `     • ${name}${assigneePart} · ${formatQty(bought)}/${formatQty(total)} ${unit}${checkmark}`
}

function renderBringLine(event: EventSnapshot, p: PurchaseSnapshot): string {
  const assigned = nameOf(event, p.assignedTo)
  const assigneePart = assigned ? ` — ${assigned}` : ''
  return `  • ${p.item}${assigneePart}`
}

interface GroupedItems {
  group: string | null
  subgroups: { subgroup: string | null; items: PurchaseSnapshot[] }[]
}

function groupBuys(buys: PurchaseSnapshot[]): GroupedItems[] {
  const map = new Map<string, PurchaseSnapshot[]>()
  for (const p of buys) {
    const key = p.group ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  const realGroups: string[] = []
  let hasUngrouped = false
  for (const key of map.keys()) {
    if (key === '') hasUngrouped = true
    else realGroups.push(key)
  }
  const order: (string | null)[] = [...realGroups]
  if (hasUngrouped) order.push(null)

  return order.map((group) => {
    const items = map.get(group ?? '')!
    const subMap = new Map<string, PurchaseSnapshot[]>()
    for (const p of items) {
      const sk = p.subgroup ?? ''
      if (!subMap.has(sk)) subMap.set(sk, [])
      subMap.get(sk)!.push(p)
    }
    const subgroups: { subgroup: string | null; items: PurchaseSnapshot[] }[] = []
    for (const [sk, list] of subMap.entries()) {
      subgroups.push({ subgroup: sk === '' ? null : sk, items: list })
    }
    return { group, subgroups }
  })
}

export function formatShoppingListText(event: EventSnapshot, t: T): string {
  const visible = event.purchases.filter((p) => !p.deleted)
  if (visible.length === 0) return ''

  const buys = visible.filter((p) => p.kind === 'buy')
  const brings = visible.filter((p) => p.kind === 'bring')

  const lines: string[] = []
  lines.push(t('share.format.header', { eventName: event.name }))
  lines.push('')

  for (const g of groupBuys(buys)) {
    const groupLabel = g.group ?? t('share.format.noGroup')
    lines.push(`📌 ${groupLabel}`)
    for (const sg of g.subgroups) {
      if (sg.subgroup) {
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
