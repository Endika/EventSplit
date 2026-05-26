import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

export interface CurrentUser {
  id: string
  name: string
  alias: string | null
  displayName: string
}

const Ctx = createContext<{
  user: CurrentUser | null
  setUser: (u: CurrentUser | null) => void
} | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  // setUser from useState is already stable; memoize the value object so the
  // context reference only changes when `user` actually changes.
  const [user, setUser] = useState<CurrentUser | null>(null)
  const value = useMemo(() => ({ user, setUser }), [user])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentUser(): CurrentUser | null {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCurrentUser must be used within UserProvider')
  return c.user
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSetCurrentUser(): (u: CurrentUser | null) => void {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSetCurrentUser must be used within UserProvider')
  return c.setUser
}
