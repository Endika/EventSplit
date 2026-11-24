import { z } from 'zod'
import {
  entityIdField,
  eventIdField,
  groupNameField,
  itemNameField,
  quantityField,
  unitField,
} from '@/application/dtos/fields'

export const AddBroughtItemSchema = z.object({
  eventId: eventIdField,
  createdBy: entityIdField,
  item: itemNameField,
  quantity: quantityField,
  unit: unitField,
  group: groupNameField,
  subgroup: groupNameField,
  broughtBy: entityIdField.nullable().optional(),
})

export type AddBroughtItemInput = z.infer<typeof AddBroughtItemSchema>
