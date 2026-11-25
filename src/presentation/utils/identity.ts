import type { CurrentUser } from '@/presentation/context/UserContext'
import type { CachedIdentity } from '@/infrastructure/persistence/LocalStorageCache'
import { userLabel } from './userLabel'

export const toIdentity = (u: CachedIdentity): CachedIdentity => ({
  id: u.id,
  name: u.name,
  alias: u.alias,
})

export const toCurrentUser = (u: CachedIdentity): CurrentUser => ({
  ...toIdentity(u),
  displayName: userLabel(u),
})
