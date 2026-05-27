import {
  EditEventDetailsSchema,
  type EditEventDetailsInput,
} from '@/application/dtos/EditEventDetailsDTO'
import type { EventLocation, EventSnapshot } from '@/domain/entities/Event'
import { HistoryAppender } from '@/domain/services/HistoryAppender'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
import { withOptimisticRetry } from '@/application/support/withOptimisticRetry'
import { buildGoogleMapsUrl } from '@/shared/utils/googleMapsUrl'

export class EditEventDetailsHandler {
  constructor(private readonly repo: IEventRepository) {}

  async execute(input: EditEventDetailsInput): Promise<{ event: EventSnapshot; version: number }> {
    const parsed = EditEventDetailsSchema.parse(input)
    const saved = await withOptimisticRetry(this.repo, parsed.eventId, (row) => {
      const nextLocation: EventLocation | null =
        parsed.location === null
          ? null
          : parsed.location === undefined
            ? row.snapshot.location
            : {
                name: parsed.location.name,
                address: parsed.location.address ?? null,
                lat: parsed.location.lat ?? null,
                lng: parsed.location.lng ?? null,
                postalCode: parsed.location.postalCode ?? null,
                googleMapsUrl: buildGoogleMapsUrl({
                  lat: parsed.location.lat ?? null,
                  lng: parsed.location.lng ?? null,
                  address: parsed.location.address ?? null,
                }),
              }

      const nextSnapshot: EventSnapshot = HistoryAppender.append(
        {
          ...row.snapshot,
          name: parsed.name ?? row.snapshot.name,
          location: nextLocation,
          generalNotes: parsed.generalNotes === undefined ? row.snapshot.generalNotes : parsed.generalNotes,
          wifiPassword:
            parsed.wifiPassword === undefined ? row.snapshot.wifiPassword : parsed.wifiPassword,
          emergencyContact:
            parsed.emergencyContact === undefined
              ? row.snapshot.emergencyContact
              : parsed.emergencyContact,
        },
        {
          type: nextLocation && !row.snapshot.location ? 'location_set' : 'notes_added',
          userId: row.snapshot.createdBy,
          description: nextLocation
            ? `Location set: ${nextLocation.name}`
            : 'Event details updated',
        },
      )

      return nextSnapshot
    })
    return { event: saved.snapshot, version: saved.version }
  }
}
