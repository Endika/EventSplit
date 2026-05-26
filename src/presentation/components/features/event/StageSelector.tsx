import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContainer } from '@/presentation/context/ContainerProvider'
import { useEventState } from '@/presentation/context/EventContext'
import { useCurrentUser } from '@/presentation/context/UserContext'
import { useWriteGuard } from '@/presentation/context/WriteGuardContext'
import { Modal } from '@/presentation/components/common/Modal'
import { Button } from '@/presentation/components/common/Button'
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
  const [info, setInfo] = useState<EventStage | null>(null)

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
            onClick={() => setInfo(s)}
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
      {info && (
        <Modal open title={t(`stage.${info}`)} dismissable onClose={() => setInfo(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">{t(`stage.${info}Desc`)}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setInfo(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const target = info
                  setInfo(null)
                  if (target !== current) change(target)
                }}
              >
                {t('stage.goTo')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
