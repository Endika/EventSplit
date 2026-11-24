import { z } from 'zod'
import { eventIdField, eventNameField, optionalTextField } from '@/application/dtos/fields'

export const LocationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: optionalTextField(200),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  postalCode: optionalTextField(20),
})

export const EditEventDetailsSchema = z.object({
  eventId: eventIdField,
  name: eventNameField.optional(),
  location: LocationSchema.nullable().optional(),
  generalNotes: optionalTextField(500),
  wifiPassword: optionalTextField(50),
  emergencyContact: optionalTextField(100),
})

export type EditEventDetailsInput = z.infer<typeof EditEventDetailsSchema>
