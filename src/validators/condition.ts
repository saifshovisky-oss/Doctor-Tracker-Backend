import { z } from 'zod';
import { baseListQuery, optionalString } from './common';

export const createConditionSchema = z.object({
  name: z
    .string({ error: 'Condition is required' })
    .trim()
    .min(1, 'Condition is required')
    .max(150, 'Condition is too long'),
});

export const updateConditionSchema = createConditionSchema;

export const conditionListQuery = baseListQuery.extend({
  search: optionalString(150),
});

export type CreateConditionInput = z.infer<typeof createConditionSchema>;
export type UpdateConditionInput = z.infer<typeof updateConditionSchema>;
export type ConditionListQuery = z.infer<typeof conditionListQuery>;
