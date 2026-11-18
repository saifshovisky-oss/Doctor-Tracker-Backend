import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { listPatients, type PatientView } from './patient.service';
import { dateRange, startOfCurrentMonthUTC, toISODateUTC } from '../utils/dates';
import type { dashboardRangeQuery } from '../validators/common';
import type { z } from 'zod';

type RangeQuery = z.infer<typeof dashboardRangeQuery>;

export interface DashboardStats {
  totalDoctors: number;
  totalPatients: number;
  newDoctorsThisMonth: number;
  newPatientsThisMonth: number;
}

export interface TrendPoint {
  date: string;
  label: string;
  count: number;
}

export interface NamedCount {
  name: string;
  value: number;
}

export interface DoctorCount {
  doctorId: string;
  name: string;
  specialization: string;
  count: number;
}

/** Resolve an inclusive UTC range for trend charts. */
function resolveRange(query: RangeQuery): { start: Date; end: Date } {
  const end = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : new Date();
  const explicit = dateRange(query.startDate, query.endDate);
  const start =
    explicit?.$gte ??
    new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (query.months - 1), 1));
  return { start, end };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function labelFor(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export async function getStats(): Promise<DashboardStats> {
  const monthStart = startOfCurrentMonthUTC();
  const [totalDoctors, totalPatients, newDoctorsThisMonth, newPatientsThisMonth] = await Promise.all([
    Doctor.countDocuments({}),
    Patient.countDocuments({}),
    Doctor.countDocuments({ createdAt: { $gte: monthStart } }),
    Patient.countDocuments({ createdAt: { $gte: monthStart } }),
  ]);
  return { totalDoctors, totalPatients, newDoctorsThisMonth, newPatientsThisMonth };
}

export async function getPatientTrends(query: RangeQuery): Promise<TrendPoint[]> {
  const { start, end } = resolveRange(query);
  const buckets = await Patient.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const counts = new Map(buckets.map((b) => [b._id, b.count]));
  const points: TrendPoint[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  // Guard against impossible ranges producing an unbounded loop.
  let guard = 0;
  while (cursor <= end && guard < 60) {
    guard += 1;
    const key = monthKey(cursor);
    points.push({ date: `${key}-01`, label: labelFor(key), count: counts.get(key) ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return points;
}

export async function getPatientsPerDoctor(): Promise<DoctorCount[]> {
  const rows = await Patient.aggregate<{
    _id: string;
    count: number;
    doctor?: { name: string; specialization: string };
  }>([
    { $group: { _id: '$doctorId', count: { $sum: 1 } } },
    { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
    { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  return rows.map((row) => ({
    doctorId: String(row._id),
    name: row.doctor?.name ?? 'Unknown doctor',
    specialization: Array.isArray(row.doctor?.specialization)
      ? (row.doctor!.specialization as string[]).join(', ')
      : (row.doctor?.specialization ?? '-'),
    count: row.count,
  }));
}

export async function getConditionDistribution(): Promise<NamedCount[]> {
  const rows = await Patient.aggregate<{ _id: string; value: number }>([
    { $group: { _id: '$condition', value: { $sum: 1 } } },
    { $sort: { value: -1, _id: 1 } },
    { $limit: 8 },
  ]);
  return rows.map((row) => ({ name: row._id, value: row.value }));
}

export async function getSpecializationDistribution(): Promise<NamedCount[]> {
  const rows = await Doctor.aggregate<{ _id: string; value: number }>([
    { $unwind: '$specialization' },
    { $group: { _id: '$specialization', value: { $sum: 1 } } },
    { $sort: { value: -1, _id: 1 } },
    { $limit: 8 },
  ]);
  return rows.map((row) => ({ name: row._id, value: row.value }));
}

export async function getRecentPatients(limit = 5): Promise<PatientView[]> {
  return listPatients({ page: 1, limit, sortBy: 'createdAt', sortOrder: 'desc' } as never).then((r) => r.data);
}

/** Exposed for tests / debugging: the UTC day used by "this month". */
export const currentMonthStartISODate = () => toISODateUTC(startOfCurrentMonthUTC());
