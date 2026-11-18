import { z } from 'zod';
import { baseListQuery, optionalString } from './common';

const required = (label: string, max: number) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const specializationSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value, ctx) => {
    const raw = Array.isArray(value) ? value : [value];
    const values = Array.from(
      new Set(raw.map((item) => item.trim()).filter(Boolean)),
    );
    if (values.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'At least one specialization is required' });
      return z.NEVER;
    }
    if (values.length > 10) {
      ctx.addIssue({ code: 'custom', message: 'A doctor can have at most 10 specializations' });
      return z.NEVER;
    }
    for (const value of values) {
      if (value.length > 120) {
        ctx.addIssue({ code: 'custom', message: 'Each specialization must be at most 120 characters' });
        return z.NEVER;
      }
    }
    return values;
  });

export const createDoctorSchema = z.object({
  name: required('Name', 150),
  specialization: specializationSchema,
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
