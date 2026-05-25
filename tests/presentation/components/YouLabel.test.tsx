import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YouLabel } from '@/presentation/components/common/YouLabel'
import { UserProvider, useSetCurrentUser } from '@/presentation/context/UserContext'
import '@/presentation/i18n/config'
import { useEffect, type ReactNode } from 'react'

function Wrap({ children, currentId }: { children: ReactNode; currentId: string | null }) {
  return (
    <UserProvider>
      <Init currentId={currentId} />
      {children}
    </UserProvider>
  )
}
function Init({ currentId }: { currentId: string | null }) {
  const set = useSetCurrentUser()
  useEffect(() => {
    if (currentId) set({ id: currentId, name: 'John', alias: null, displayName: 'John' })
  }, [currentId, set])
  return null
}

describe('YouLabel', () => {
  it('renders nothing when userId is not the current user', () => {
    render(<Wrap currentId="other"><YouLabel userId="someone-else" /></Wrap>)
    expect(screen.queryByText(/You|Tú|Zu/)).toBeNull()
  })
  it('renders the badge when userId matches current user', () => {
    render(<Wrap currentId="me"><YouLabel userId="me" /></Wrap>)
    expect(screen.getByText(/You|Tú|Zu/)).toBeInTheDocument()
  })
})
