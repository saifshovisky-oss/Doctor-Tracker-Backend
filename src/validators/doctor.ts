import { z } from 'zod';
import { baseListQuery, optionalString } from './common';

const required = (label: string, max: number) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

export const createDoctorSchema = z.object({
  name: required('Name', 150),
  specialization: required('Specialization', 120),
  hospital: required('Hospital', 180),
  phone: required('Phone', 40),
  email: z.string({ error: 'Email is required' }).trim().min(1, 'Email is required').email('Enter a valid email').max(254),
});

export const updateDoctorSchema = createDoctorSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field is required',
});

export const doctorListQuery = baseListQuery.extend({
  specialization: optionalString(120),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorListQuery = z.infer<typeof doctorListQuery>;
