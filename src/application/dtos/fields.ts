import { z } from 'zod'
import { EVENT_NAME_MAX, EVENT_NAME_MIN } from '@/domain/entities/Event'
import { CONCEPT_MAX, CONCEPT_MIN } from '@/domain/entities/ManualLiquidation'
import {
  DAILY_CONSUMPTION_MAX,
  GROUP_NAME_MAX,
  ITEM_NAME_MAX,
  ITEM_NAME_MIN,
  QUANTITY_MAX,
  UNIT_MAX,
  UNIT_MIN,
} from '@/domain/entities/Purchase'
import {
  ALIAS_MAX,
  DIETARY_MAX,
  EMAIL_MAX,
  HOUSEHOLD_MAX,
  NOTES_MAX,
  PERSON_NAME_MAX,
  PERSON_NAME_MIN,
  PHONE_MAX,
  USER_KINDS,
} from '@/domain/entities/User'
import { EVENT_ID_PATTERN } from '@/domain/value-objects/EventId'

export const eventIdField = z.string().regex(EVENT_ID_PATTERN)
export const entityIdField = z.string().uuid()
export const guardianIdField = z.string().nullable().optional()
export const liquidationIdField = z.string()
export const userKindField = z.enum(USER_KINDS).optional()

export const itemNameField = z.string().trim().min(ITEM_NAME_MIN).max(ITEM_NAME_MAX)
export const personNameField = z.string().trim().min(PERSON_NAME_MIN).max(PERSON_NAME_MAX)
export const eventNameField = z.string().trim().min(EVENT_NAME_MIN).max(EVENT_NAME_MAX)
export const conceptField = z.string().trim().min(CONCEPT_MIN).max(CONCEPT_MAX)
export const unitField = z.string().trim().min(UNIT_MIN).max(UNIT_MAX)
export const groupKeyField = z.string().min(1).max(50)
export const renamedToField = z.string().trim().max(50)
export const groupOrderField = z.array(z.string()).max(50)

export const optionalTextField = (max: number) => z.string().trim().max(max).nullable().optional()
export const aliasField = optionalTextField(ALIAS_MAX)
export const emailField = optionalTextField(EMAIL_MAX)
export const phoneField = optionalTextField(PHONE_MAX)
export const dietaryField = optionalTextField(DIETARY_MAX)
export const notesField = optionalTextField(NOTES_MAX)
export const householdField = optionalTextField(HOUSEHOLD_MAX)
export const groupNameField = optionalTextField(GROUP_NAME_MAX)

export const quantityField = z.number().positive().max(QUANTITY_MAX)
export const amountEurosField = z.number().positive().max(999_999.99)
export const dailyConsumptionField = z.number().positive().max(DAILY_CONSUMPTION_MAX)
export const daysField = z.number().int().positive()

export const consumersField = z
  .array(
    z.object({
      userId: entityIdField,
      multiplier: z.number().min(0).max(10),
    }),
  )
  .min(1)

export const purchaseLinksField = z
  .array(z.object({ purchaseId: entityIdField, quantity: z.number().positive().max(100_000) }))
  .optional()
export const splitAmongField = z.array(entityIdField).optional()
export const affectsField = z.array(entityIdField).default([])
