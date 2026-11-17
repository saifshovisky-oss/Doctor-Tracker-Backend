import { ApiError } from './apiError';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function parseDate(value: string, boundary: 'start' | 'end'): Date {
  let date: Date;
  if (DATE_ONLY.test(value)) {
    // A date-only string is interpreted as a UTC calendar day so every
    // client, regardless of its local timezone, gets identical boundaries.
    date = new Date(`${value}T${boundary === 'start' ? '00:00:00.000Z' : '23:59:59.999Z'}`);
  } else if (ISO.test(value)) {
    date = new Date(value);
  } else {
    throw ApiError.badRequest(`Invalid date: ${value}. Use YYYY-MM-DD or a full ISO date.`);
  }
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest(`Invalid date: ${value}`);
  }
  return date;
}

/** Build a UTC-normalised date filter for createdAt. */
export function dateRange(startDate?: string, endDate?: string): { $gte?: Date; $lte?: Date } | undefined {
  if (!startDate && !endDate) return undefined;
  const range: { $gte?: Date; $lte?: Date } = {};
  if (startDate) range.$gte = parseDate(startDate, 'start');
  if (endDate) range.$lte = parseDate(endDate, 'end');
  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    throw ApiError.badRequest('startDate must be before or equal to endDate');
  }
  return range;
}

/** Start of the current calendar month in UTC. */
export function startOfCurrentMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Format a Date as YYYY-MM-DD in UTC (used by aggregation buckets). */
export function toISODateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}
