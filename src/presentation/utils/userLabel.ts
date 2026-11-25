export interface Named {
  id: string
  name: string
  alias: string | null
}

export const userLabel = (u: { name: string; alias: string | null }): string =>
  u.alias ? `${u.name} (${u.alias})` : u.name

export const userName = (users: readonly Named[], id: string): string =>
  users.find((u) => u.id === id)?.name ?? '?'

export const userLabelOf = (users: readonly Named[], id: string): string => {
  const u = users.find((x) => x.id === id)
  return u ? userLabel(u) : '?'
}
