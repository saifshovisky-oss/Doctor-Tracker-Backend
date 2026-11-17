import { Condition } from '../models/Condition';
import { Patient } from '../models/Patient';
import { ApiError } from '../utils/apiError';
import { assertObjectId } from '../utils/ids';
import { buildPaginated, type PaginatedData } from '../utils/response';
import type { ConditionListQuery, CreateConditionInput, UpdateConditionInput } from '../validators/condition';

export interface ConditionView {
  id: string;
  name: string;
  patientCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTABLE = new Set(['name', 'patientCount', 'createdAt']);

/** Normalized, lowercased key used for case-insensitive uniqueness. */
export function conditionKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function listConditions(query: ConditionListQuery): Promise<PaginatedData<ConditionView>> {
  const filter: Record<string, unknown> = {};
  if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i');

  const sortBy = SORTABLE.has(query.sortBy) ? query.sortBy : 'createdAt';
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const skip = (query.page - 1) * query.limit;

  // Count patients per condition with a case-insensitive match against the
  // denormalized patient.condition string.
  const [result] = await Condition.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'patients',
        let: { key: '$key' },
        pipeline: [
          { $match: { $expr: { $eq: [{ $toLower: '$condition' }, '$$key'] } } },
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
        patientCount: 1,
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

  const items = (result?.items ?? []) as ConditionView[];
  const totalItems = (result?.total?.[0]?.count as number) ?? 0;
  return buildPaginated(items, totalItems, query.page, query.limit);
}

export async function createCondition(input: CreateConditionInput): Promise<ConditionView> {
  const name = input.name.trim();
  const key = conditionKey(name);
  try {
    await Condition.create({ name, key });
  } catch (err) {
    if (err instanceof Error && /E11000/.test(err.message)) {
      throw new ApiError(409, 'A condition with this name already exists', { name: 'Duplicate condition' });
    }
    throw err;
  }
  const created = await Condition.findOne({ key }).lean();
  return {
    id: String(created!._id),
    name: created!.name,
    patientCount: 0,
    createdAt: created!.createdAt,
    updatedAt: created!.updatedAt,
  };
}

export async function updateCondition(id: string, input: UpdateConditionInput): Promise<ConditionView> {
  assertObjectId(id);
  const name = input.name.trim();
  const key = conditionKey(name);

  const existing = await Condition.findById(id).lean();
  if (!existing) throw ApiError.notFound('Condition not found');

  const duplicate = await Condition.findOne({ key, _id: { $ne: id } }).lean();
  if (duplicate) {
    throw new ApiError(409, 'A condition with this name already exists', { name: 'Duplicate condition' });
  }

  // Propagate the rename to patients whose condition matches the old name
  // (case-insensitive) so the catalog stays in sync with live data.
  if (existing.name !== name) {
    await Patient.updateMany(
      { $expr: { $eq: [{ $toLower: '$condition' }, conditionKey(existing.name)] } },
      { $set: { condition: name } },
    );
  }

  await Condition.updateOne({ _id: id }, { $set: { name, key } });
  const updated = await Condition.findById(id).lean();
  const patientCount = await Patient.countDocuments({
    $expr: { $eq: [{ $toLower: '$condition' }, key] },
  });
  return {
    id: String(updated!._id),
    name: updated!.name,
    patientCount,
    createdAt: updated!.createdAt,
    updatedAt: updated!.updatedAt,
  };
}

export async function deleteCondition(id: string): Promise<void> {
  assertObjectId(id);
  const condition = await Condition.findById(id).lean();
  if (!condition) throw ApiError.notFound('Condition not found');

  const patientCount = await Patient.countDocuments({
    $expr: { $eq: [{ $toLower: '$condition' }, condition.key] },
  });
  if (patientCount > 0) {
    throw new ApiError(
      409,
      'This condition is used by existing patients. Reassign or change those patients before deleting it.',
      { patientCount },
    );
  }
  await Condition.findByIdAndDelete(id);
}
