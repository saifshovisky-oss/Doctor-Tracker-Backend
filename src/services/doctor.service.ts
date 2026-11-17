import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { Photo } from '../models/Photo';
import { ApiError } from '../utils/apiError';
import { assertObjectId } from '../utils/ids';
import { dateRange } from '../utils/dates';
import { buildPaginated, type PaginatedData } from '../utils/response';
import type { CreateDoctorInput, DoctorListQuery, UpdateDoctorInput } from '../validators/doctor';

export interface DoctorView {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  patientCount: number;
  hasPhoto: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTABLE = new Set(['name', 'specialization', 'hospital', 'email', 'createdAt', 'patientCount']);

function normalizeEmail(email?: string): string | undefined {
  return email?.toLowerCase().trim();
}

export async function listDoctors(query: DoctorListQuery): Promise<PaginatedData<DoctorView>> {
  const filter: Record<string, unknown> = {};
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { hospital: rx }, { specialization: rx }];
  }
  if (query.specialization) filter.specialization = query.specialization;
  const created = dateRange(query.startDate, query.endDate);
  if (created) filter.createdAt = created;

  const sortBy = SORTABLE.has(query.sortBy) ? query.sortBy : 'createdAt';
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const skip = (query.page - 1) * query.limit;

  // One aggregation: count related patients via an indexed lookup, then
  // facet for page items + total. No N+1 queries, no in-memory pagination.
  const [result] = await Doctor.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'patients',
        let: { doctorId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$doctorId', '$$doctorId'] } } },
          { $count: 'count' },
        ],
        as: '_patientCount',
      },
    },
    { $addFields: { patientCount: { $ifNull: [{ $arrayElemAt: ['$_patientCount.count', 0] }, 0] } } },
    { $unset: '_patientCount' },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        specialization: 1,
        hospital: 1,
        phone: 1,
        email: 1,
        patientCount: 1,
        hasPhoto: { $ne: ['$photoId', null] },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { [sortBy]: sortDirection, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: query.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const items = (result?.items ?? []) as DoctorView[];
  const totalItems = (result?.total?.[0]?.count as number) ?? 0;
  return buildPaginated(items, totalItems, query.page, query.limit);
}

export async function getDoctor(id: string): Promise<DoctorView> {
  assertObjectId(id);
  const doctor = await Doctor.findById(id).lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');
  const patientCount = await Patient.countDocuments({ doctorId: doctor._id });
  return {
    id: String(doctor._id),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
    patientCount,
    hasPhoto: !!doctor.photoId,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

export async function createDoctor(input: CreateDoctorInput): Promise<DoctorView> {
  const doctor = await Doctor.create({
    ...input,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
  });
  return getDoctor(String(doctor._id));
}

export async function updateDoctor(id: string, input: UpdateDoctorInput): Promise<DoctorView> {
  assertObjectId(id);
  const payload = { ...input };
  if (payload.email) payload.email = normalizeEmail(payload.email);
  const doctor = await Doctor.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
    context: 'query',
  }).lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return getDoctor(id);
}

export async function deleteDoctor(id: string): Promise<void> {
  assertObjectId(id);
  const doctor = await Doctor.findById(id).select('photoId');
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const patientCount = await Patient.countDocuments({ doctorId: id });
  if (patientCount > 0) {
    throw new ApiError(
      409,
      'This doctor still has associated patients. Reassign or remove them before deleting.',
      { patientCount },
    );
  }
  if (doctor.photoId) await Photo.findByIdAndDelete(doctor.photoId);
  await Doctor.findByIdAndDelete(id);
}

/** Distinct specializations, used by the filter dropdown. */
export async function listSpecializations(): Promise<string[]> {
  const values = await Doctor.distinct('specialization');
  return values.filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
}
