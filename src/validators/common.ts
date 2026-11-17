import mongoose from 'mongoose';
import { z } from 'zod';

export const optionalString = (max = 254) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max).optional(),
  );

const dateString = z.string().refine(
  (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v),
  'Use YYYY-MM-DD or an ISO date',
);

export const baseListQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString(150),
  sortBy: z.string().trim().max(50).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});

export const idParamSchema = z.object({
  id: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid id'),
});

export const dashboardRangeQuery = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export type BaseListQuery = z.infer<typeof baseListQuery>;
