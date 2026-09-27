import type { Container } from '@/shared/di/Container'
import { buildContainer } from '@/shared/di/wiring'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { PinForwardingEventRepository } from '@/infrastructure/persistence/PinForwardingEventRepository'
import type { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

const silentNotifier: IEventChangeNotifier = {
  publish: () => {},
  subscribe: () => () => {},
}

/**
 * The app's real wiring with the server swapped for the in-memory fake (and no
 * Realtime). A new container over the same repo stands in for a page reload:
 * only what lives in localStorage survives it.
 */
export function inMemoryContainer(repo: InMemoryEventRepository): Container {
  const c = buildContainer()
  c.register<IEventChangeNotifier>('realtime', () => silentNotifier)
  c.register<IEventRepository>(
    'eventRepo',
    () => new PinForwardingEventRepository(repo, c.resolve<UnlockedPinHolder>('unlockedPin')),
  )
  return c
}
