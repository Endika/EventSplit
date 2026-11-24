import { z } from 'zod'
import {
  consumersField,
  dailyConsumptionField,
  daysField,
  entityIdField,
  eventIdField,
  groupNameField,
  itemNameField,
  quantityField,
  unitField,
} from '@/application/dtos/fields'

export const AddPurchaseSchema = z.object({
  eventId: eventIdField,
  createdBy: entityIdField,
  item: itemNameField,
  quantity: quantityField,
  unit: unitField,
  dailyConsumption: dailyConsumptionField,
  consumers: consumersField,
  days: daysField,
  assignedTo: entityIdField.nullable().optional(),
  group: groupNameField,
  subgroup: groupNameField,
})

export type AddPurchaseInput = z.infer<typeof AddPurchaseSchema>
