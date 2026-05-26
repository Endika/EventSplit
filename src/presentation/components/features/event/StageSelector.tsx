import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import type { SetEventStageHandler } from '@/application/handlers/SetEventStageHandler'
import type { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import type { EventStage } from '@/domain/entities/Event'
import { reportError } from '@/shared/utils/reportError'

const STAGES: EventStage[] = ['doodle', 'shopping', 'expenses']

export function StageSelector() {
  const { t } = useTranslation()
  const container = useContainer()
  const { event, setEvent } = useEventState()
  const me = useCurrentUser()
  const { guardedExecute } = useWriteGuard()

  if (!event || !me) return null
  const current = event.stage

  function change(stage: EventStage) {
    if (!event || !me || stage === current) return
    guardedExecute(async () => {
      try {
        const handler = container.resolve<SetEventStageHandler>('setEventStage')
        const result = await handler.execute({
          eventId: event.id,
          userId: me.id,
          stage,
        })
        container
          .resolve<LocalStorageCache>('cache')
          .set(event.id, { snapshot: result.event, version: result.version })
        setEvent(result.event, result.version)
      } catch (err) {
        reportError('StageSelector', err)
      }
    })
  }

  return (
    <div className="flex gap-1 rounded-lg bg-slate-900 p-1" role="group" aria-label={t('stage.title')}>
      {STAGES.map((s) => {
        const active = current === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => change(s)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition ${
              active
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            aria-pressed={active}
          >
            {t(`stage.${s}`)}
          </button>
        )
      })}
    </div>
  )
}
