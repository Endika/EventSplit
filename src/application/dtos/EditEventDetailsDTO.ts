import { z } from 'zod'

export const LocationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
})

export const EditEventDetailsSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  location: LocationSchema.nullable().optional(),
  generalNotes: z.string().trim().max(500).nullable().optional(),
  wifiPassword: z.string().trim().max(50).nullable().optional(),
  emergencyContact: z.string().trim().max(100).nullable().optional(),
})

export type EditEventDetailsInput = z.infer<typeof EditEventDetailsSchema>
