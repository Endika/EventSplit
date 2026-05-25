import { createContext, type ReactNode, useContext, useState } from 'react'

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
  const [user, setUser] = useState<CurrentUser | null>(null)
  return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>
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
