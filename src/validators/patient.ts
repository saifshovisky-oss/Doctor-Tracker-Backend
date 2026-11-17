import mongoose from 'mongoose';
import { z } from 'zod';
import { baseListQuery, optionalString } from './common';

const objectId = z
  .string()
  .refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid doctor id');

export const createPatientSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(150),
  age: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0, 'Age must be at least 0').max(120, 'Age must be at most 120').optional(),
  ),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: optionalString(40),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().email('Enter a valid email').max(254).optional(),
  ),
  condition: z.string({ required_error: 'Condition is required' }).trim().min(1, 'Condition is required').max(150),
  doctorId: objectId,
  notes: optionalString(2000),
});

export const updatePatientSchema = createPatientSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field is required',
});

export const patientListQuery = baseListQuery.extend({
  condition: optionalString(150),
  doctorId: objectId.optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientListQuery = z.infer<typeof patientListQuery>;
