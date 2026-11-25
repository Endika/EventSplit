import { Container } from '@/shared/di/Container'
import { getSupabase } from '@/infrastructure/sync/SupabaseClient'
import { SupabaseEventRepository } from '@/infrastructure/persistence/SupabaseEventRepository'
import { NotifyingEventRepository } from '@/infrastructure/persistence/NotifyingEventRepository'
import { PinForwardingEventRepository } from '@/infrastructure/persistence/PinForwardingEventRepository'
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
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { CloneIntoEventHandler } from '@/application/handlers/CloneIntoEventHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { SetAvailabilityMetaHandler } from '@/application/handlers/SetAvailabilityMetaHandler'
import { EditEventDetailsHandler } from '@/application/handlers/EditEventDetailsHandler'
import { SetEditPinHandler } from '@/application/handlers/SetEditPinHandler'
import { VerifyPinHandler } from '@/application/handlers/VerifyPinHandler'
import { DeleteEventHandler } from '@/application/handlers/DeleteEventHandler'
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
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

export const REPO_HANDLERS = {
  createEvent: CreateEventHandler,
  joinAsNewUser: JoinAsNewUserHandler,
  addPurchase: AddPurchaseHandler,
  addBroughtItem: AddBroughtItemHandler,
  editBroughtItem: EditBroughtItemHandler,
  addExpense: AddExpenseHandler,
  editExpense: EditExpenseHandler,
  deleteExpense: DeleteExpenseHandler,
  refreshEvent: RefreshEventHandler,
  updateProfile: UpdateProfileHandler,
  setDayOptions: SetDayOptionsHandler,
  cloneIntoEvent: CloneIntoEventHandler,
  setAvailabilityBatch: SetAvailabilityBatchHandler,
  setAvailabilityMeta: SetAvailabilityMetaHandler,
  editEventDetails: EditEventDetailsHandler,
  setEditPin: SetEditPinHandler,
  verifyPin: VerifyPinHandler,
  deleteEvent: DeleteEventHandler,
  editPurchase: EditPurchaseHandler,
  assignPurchase: AssignPurchaseHandler,
  deletePurchase: DeletePurchaseHandler,
  recoverPurchase: RecoverPurchaseHandler,
  recoverExpense: RecoverExpenseHandler,
  removeParticipant: RemoveParticipantHandler,
  setEventStage: SetEventStageHandler,
  toggleSettlement: ToggleSettlementHandler,
  renameGroup: RenameGroupHandler,
  setGroupOrder: SetGroupOrderHandler,
  renameSubgroup: RenameSubgroupHandler,
  setSubgroupOrder: SetSubgroupOrderHandler,
  addManualLiquidation: AddManualLiquidationHandler,
  editManualLiquidation: EditManualLiquidationHandler,
  deleteManualLiquidation: DeleteManualLiquidationHandler,
  recoverManualLiquidation: RecoverManualLiquidationHandler,
  toggleLiquidationShare: ToggleLiquidationShareHandler,
} satisfies Record<string, new (repo: IEventRepository) => unknown>

export function buildContainer(): Container {
  const c = new Container()
  c.register('supabase', () => getSupabase())
  c.register<IEventChangeNotifier>('realtime', () => new RealtimeSync(c.resolve('supabase')))
  c.register('unlockedPin', () => new UnlockedPinHolder())
  c.register<IEventRepository>(
    'eventRepo',
    () =>
      new NotifyingEventRepository(
        new PinForwardingEventRepository(
          new SupabaseEventRepository(c.resolve('supabase')),
          c.resolve<UnlockedPinHolder>('unlockedPin'),
        ),
        c.resolve<IEventChangeNotifier>('realtime'),
      ),
  )
  c.register('cache', () => new LocalStorageCache())
  c.register('online', () => {
    const d = new OnlineDetector()
    d.start()
    return d
  })
  for (const [key, Handler] of Object.entries(REPO_HANDLERS)) {
    c.register(key, () => new Handler(c.resolve<IEventRepository>('eventRepo')))
  }
  return c
}
