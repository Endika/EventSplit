import { z } from 'zod'
import {
  entityIdField,
  eventIdField,
  groupNameField,
  itemNameField,
  quantityField,
  unitField,
} from '@/application/dtos/fields'

export const EditBroughtItemSchema = z.object({
  eventId: eventIdField,
  purchaseId: entityIdField,
  editedBy: entityIdField,
  item: itemNameField,
  quantity: quantityField,
  unit: unitField,
  group: groupNameField,
  subgroup: groupNameField,
  broughtBy: entityIdField.nullable().optional(),
})

export type EditBroughtItemInput = z.infer<typeof EditBroughtItemSchema>
