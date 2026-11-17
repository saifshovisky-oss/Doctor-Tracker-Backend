import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { ApiError } from '../utils/apiError';
import { assertObjectId } from '../utils/ids';
import { dateRange } from '../utils/dates';
import { buildPaginated, type PaginatedData } from '../utils/response';
import type { CreatePatientInput, PatientListQuery, UpdatePatientInput } from '../validators/patient';

export interface PatientView {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  condition: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTABLE = new Set(['name', 'age', 'condition', 'createdAt', 'doctorName', 'doctorId']);

export async function listPatients(query: PatientListQuery): Promise<PaginatedData<PatientView>> {
  const filter: Record<string, unknown> = {};
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (query.condition) filter.condition = query.condition;
  if (query.doctorId) filter.doctorId = new mongoose.Types.ObjectId(query.doctorId);
  const created = dateRange(query.startDate, query.endDate);
  if (created) filter.createdAt = created;

  const sortBy = SORTABLE.has(query.sortBy) ? query.sortBy : 'createdAt';
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const skip = (query.page - 1) * query.limit;

  const [result] = await Patient.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'doctors',
        localField: 'doctorId',
        foreignField: '_id',
        as: '_doctor',
      },
    },
    { $unwind: { path: '$_doctor', preserveNullAndEmptyArrays: true } },
    { $addFields: { doctorName: '$_doctor.name', doctorSpecialization: '$_doctor.specialization' } },
    { $unset: '_doctor' },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        doctorId: { $toString: '$doctorId' },
        doctorName: 1,
        doctorSpecialization: 1,
        name: 1,
        age: 1,
        gender: 1,
        phone: 1,
        email: 1,
        condition: 1,
        notes: 1,
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

  const items = (result?.items ?? []) as PatientView[];
  const totalItems = (result?.total?.[0]?.count as number) ?? 0;
  return buildPaginated(items, totalItems, query.page, query.limit);
}

export async function getPatient(id: string): Promise<PatientView> {
  assertObjectId(id);
  const patient = await Patient.findById(id)
    .populate('doctorId', 'name specialization hospital email phone')
    .lean();
  if (!patient) throw ApiError.notFound('Patient not found');
  const doctor = patient.doctorId as unknown as { _id: unknown; name: string; specialization: string } | null;
  return {
    id: String(patient._id),
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    condition: patient.condition,
    doctorId: doctor ? String(doctor._id) : String(patient.doctorId),
    doctorName: doctor?.name,
    doctorSpecialization: doctor?.specialization,
    notes: patient.notes,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

async function assertDoctorExists(doctorId: string): Promise<void> {
  assertObjectId(doctorId);
  const exists = await Doctor.exists({ _id: doctorId });
  if (!exists) throw ApiError.badRequest('The selected doctor does not exist', { doctorId: 'Doctor not found' });
}

function normalize(input: CreatePatientInput | UpdatePatientInput) {
  const payload: Record<string, unknown> = { ...input };
  if (typeof payload.email === 'string') payload.email = payload.email.toLowerCase().trim();
  if (typeof payload.phone === 'string') payload.phone = payload.phone.trim();
  return payload;
}

export async function createPatient(input: CreatePatientInput): Promise<PatientView> {
  await assertDoctorExists(input.doctorId);
  const patient = await Patient.create({ ...normalize(input), doctorId: input.doctorId });
  return getPatient(String(patient._id));
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<PatientView> {
  assertObjectId(id);
  if (input.doctorId) await assertDoctorExists(input.doctorId);
  const patient = await Patient.findByIdAndUpdate(id, normalize(input), {
    new: true,
    runValidators: true,
    context: 'query',
  }).lean();
  if (!patient) throw ApiError.notFound('Patient not found');
  return getPatient(id);
}

export async function deletePatient(id: string): Promise<void> {
  assertObjectId(id);
  const deleted = await Patient.findByIdAndDelete(id).lean();
  if (!deleted) throw ApiError.notFound('Patient not found');
}

/** Used by dashboard "recent patients" with a single indexed query. */
export async function recentPatients(limit: number): Promise<PatientView[]> {
  return listPatients({ page: 1, limit, sortBy: 'createdAt', sortOrder: 'desc' } as PatientListQuery).then(
    (r) => r.data,
  );
}
