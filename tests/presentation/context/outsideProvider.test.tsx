import { it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEditPins } from '@/presentation/context/EditPinContext'
import { useEventState } from '@/presentation/context/EventContext'
import { useOnlineStatus } from '@/presentation/context/SyncContext'
import { useCurrentUser, useSetCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'

it('every context hook names its missing provider when used outside it', () => {
  const hooks: [() => unknown, RegExp][] = [
    [useContainer, /ContainerProvider/],
    [useEditPins, /EditPinProvider/],
    [useEventState, /EventProvider/],
    [useOnlineStatus, /SyncProvider/],
    [useCurrentUser, /UserProvider/],
    [useSetCurrentUser, /UserProvider/],
    [useWriteGuard, /WriteGuardProvider/],
  ]
  for (const [hook, provider] of hooks) {
    expect(() => renderHook(() => hook())).toThrow(provider)
  }
})
