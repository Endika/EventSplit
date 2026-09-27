import {
  type IEventRepository,
  isLockedEvent,
  type ReadResult,
} from '@/domain/repositories/IEventRepository'

/** A read that must not come back locked: the test fails loudly if it does. */
export async function readEvent(
  repo: IEventRepository,
  id: string,
  pin: string | null = null,
): Promise<ReadResult | null> {
  const read = await repo.findById(id, pin)
  if (isLockedEvent(read)) throw new Error(`event ${id} came back locked`)
  return read
}
