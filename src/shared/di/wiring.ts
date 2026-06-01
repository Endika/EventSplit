import { Container } from '@/shared/di/Container'
import { getSupabase } from '@/infrastructure/sync/SupabaseClient'
import { SupabaseEventRepository } from '@/infrastructure/persistence/SupabaseEventRepository'
import { NotifyingEventRepository } from '@/infrastructure/persistence/NotifyingEventRepository'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { RealtimeSync } from '@/infrastructure/sync/RealtimeSync'
import { OnlineDetector } from '@/infrastructure/network/OnlineDetector'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import { EditBroughtItemHandler } from '@/application/handlers/EditBroughtItemHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { EditExpenseHandler } from '@/application/handlers/EditExpenseHandler'
import { DeleteExpenseHandler } from '@/application/handlers/DeleteExpenseHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { SetAvailabilityMetaHandler } from '@/application/handlers/SetAvailabilityMetaHandler'
import { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import { AssignPurchaseHandler } from '@/application/handlers/AssignPurchaseHandler'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { RecoverPurchaseHandler } from '@/application/handlers/RecoverPurchaseHandler'
import { RecoverExpenseHandler } from '@/application/handlers/RecoverExpenseHandler'
import { RemoveParticipantHandler } from '@/application/handlers/RemoveParticipantHandler'
import { SetEventStageHandler } from '@/application/handlers/SetEventStageHandler'
import { ToggleSettlementHandler } from '@/application/handlers/ToggleSettlementHandler'
import { RenameGroupHandler } from '@/application/handlers/RenameGroupHandler'
import { SetGroupOrderHandler } from '@/application/handlers/SetGroupOrderHandler'
import { RenameSubgroupHandler } from '@/application/handlers/RenameSubgroupHandler'
import { SetSubgroupOrderHandler } from '@/application/handlers/SetSubgroupOrderHandler'
import { RefreshEventHandler } from '@/application/handlers/RefreshEventHandler'
import { AddManualLiquidationHandler } from '@/application/handlers/AddManualLiquidationHandler'
import { EditManualLiquidationHandler } from '@/application/handlers/EditManualLiquidationHandler'
import { DeleteManualLiquidationHandler } from '@/application/handlers/DeleteManualLiquidationHandler'
import { RecoverManualLiquidationHandler } from '@/application/handlers/RecoverManualLiquidationHandler'
import { ToggleLiquidationShareHandler } from '@/application/handlers/ToggleLiquidationShareHandler'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'

export function buildContainer(): Container {
  const c = new Container()
  c.register('supabase', () => getSupabase())
  c.register<IEventChangeNotifier>('realtime', () => new RealtimeSync(c.resolve('supabase')))
  c.register<IEventRepository>(
    'eventRepo',
    () =>
      new NotifyingEventRepository(
        new SupabaseEventRepository(c.resolve('supabase')),
        c.resolve<IEventChangeNotifier>('realtime'),
      ),
  )
  c.register('cache', () => new LocalStorageCache())
  c.register('online', () => {
    const d = new OnlineDetector()
    d.start()
    return d
  })
  c.register('createEvent', () => new CreateEventHandler(c.resolve('eventRepo')))
  c.register('joinAsNewUser', () => new JoinAsNewUserHandler(c.resolve('eventRepo')))
  c.register('addPurchase', () => new AddPurchaseHandler(c.resolve('eventRepo')))
  c.register('addBroughtItem', () => new AddBroughtItemHandler(c.resolve('eventRepo')))
  c.register('editBroughtItem', () => new EditBroughtItemHandler(c.resolve('eventRepo')))
  c.register('addExpense', () => new AddExpenseHandler(c.resolve('eventRepo')))
  c.register('editExpense', () => new EditExpenseHandler(c.resolve('eventRepo')))
  c.register('deleteExpense', () => new DeleteExpenseHandler(c.resolve('eventRepo')))
  c.register('refreshEvent', () => new RefreshEventHandler(c.resolve('eventRepo')))
  c.register('updateProfile', () => new UpdateProfileHandler(c.resolve('eventRepo')))
  c.register('setEventDays', () => new SetEventDaysHandler(c.resolve('eventRepo')))
  c.register('setAvailabilityBatch', () => new SetAvailabilityBatchHandler(c.resolve('eventRepo')))
  c.register('setAvailabilityMeta', () => new SetAvailabilityMetaHandler(c.resolve('eventRepo')))
  c.register('editEventDetails', () => new EditEventDetailsHandler(c.resolve('eventRepo')))
  c.register('setEditPin', () => new SetEditPinHandler(c.resolve('eventRepo')))
  c.register('editPurchase', () => new EditPurchaseHandler(c.resolve('eventRepo')))
  c.register('assignPurchase', () => new AssignPurchaseHandler(c.resolve('eventRepo')))
  c.register('deletePurchase', () => new DeletePurchaseHandler(c.resolve('eventRepo')))
  c.register('recoverPurchase', () => new RecoverPurchaseHandler(c.resolve('eventRepo')))
  c.register('recoverExpense', () => new RecoverExpenseHandler(c.resolve('eventRepo')))
  c.register('removeParticipant', () => new RemoveParticipantHandler(c.resolve('eventRepo')))
  c.register('setEventStage', () => new SetEventStageHandler(c.resolve('eventRepo')))
  c.register('toggleSettlement', () => new ToggleSettlementHandler(c.resolve('eventRepo')))
  c.register('renameGroup', () => new RenameGroupHandler(c.resolve('eventRepo')))
  c.register('setGroupOrder', () => new SetGroupOrderHandler(c.resolve('eventRepo')))
  c.register('renameSubgroup', () => new RenameSubgroupHandler(c.resolve('eventRepo')))
  c.register('setSubgroupOrder', () => new SetSubgroupOrderHandler(c.resolve('eventRepo')))
  c.register('addManualLiquidation', () => new AddManualLiquidationHandler(c.resolve('eventRepo')))
  c.register(
    'editManualLiquidation',
    () => new EditManualLiquidationHandler(c.resolve('eventRepo')),
  )
  c.register(
    'deleteManualLiquidation',
    () => new DeleteManualLiquidationHandler(c.resolve('eventRepo')),
  )
  c.register(
    'recoverManualLiquidation',
    () => new RecoverManualLiquidationHandler(c.resolve('eventRepo')),
  )
  c.register(
    'toggleLiquidationShare',
    () => new ToggleLiquidationShareHandler(c.resolve('eventRepo')),
  )
  return c
}
