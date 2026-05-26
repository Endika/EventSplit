import { Container } from '@/shared/di/Container'
import { getSupabase } from '@/infrastructure/sync/SupabaseClient'
import { SupabaseEventRepository } from '@/infrastructure/persistence/SupabaseEventRepository'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { RealtimeSync } from '@/infrastructure/sync/RealtimeSync'
import { OnlineDetector } from '@/infrastructure/network/OnlineDetector'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { SyncEventHandler } from '@/application/handlers/SyncEventHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import { SetAvailabilityHandler } from '@/application/handlers/SetAvailabilityHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import { RevertHandler } from '@/application/handlers/RevertHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import { RemoveParticipantHandler } from '@/application/handlers/RemoveParticipantHandler'
import { SetEventStageHandler } from '@/application/handlers/SetEventStageHandler'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'

export function buildContainer(): Container {
  const c = new Container()
  c.register('supabase', () => getSupabase())
  c.register<IEventRepository>('eventRepo', () => new SupabaseEventRepository(c.resolve('supabase')))
  c.register('cache', () => new LocalStorageCache())
  c.register('realtime', () => new RealtimeSync(c.resolve('supabase')))
  c.register('online', () => {
    const d = new OnlineDetector()
    d.start()
    return d
  })
  c.register('createEvent', () => new CreateEventHandler(c.resolve('eventRepo')))
  c.register('joinAsNewUser', () => new JoinAsNewUserHandler(c.resolve('eventRepo')))
  c.register('addPurchase', () => new AddPurchaseHandler(c.resolve('eventRepo')))
  c.register('addExpense', () => new AddExpenseHandler(c.resolve('eventRepo')))
  c.register('syncEvent', () => new SyncEventHandler())
  c.register('updateProfile', () => new UpdateProfileHandler(c.resolve('eventRepo')))
  c.register('setEventDays', () => new SetEventDaysHandler(c.resolve('eventRepo')))
  c.register('setAvailability', () => new SetAvailabilityHandler(c.resolve('eventRepo')))
  c.register('setAvailabilityBatch', () => new SetAvailabilityBatchHandler(c.resolve('eventRepo')))
  c.register('editEventDetails', () => new EditEventDetailsHandler(c.resolve('eventRepo')))
  c.register('revert', () => new RevertHandler(c.resolve('eventRepo')))
  c.register('setEditPin', () => new SetEditPinHandler(c.resolve('eventRepo')))
  c.register('editPurchase', () => new EditPurchaseHandler(c.resolve('eventRepo')))
  c.register('removeParticipant', () => new RemoveParticipantHandler(c.resolve('eventRepo')))
  c.register('setEventStage', () => new SetEventStageHandler(c.resolve('eventRepo')))
  return c
}
