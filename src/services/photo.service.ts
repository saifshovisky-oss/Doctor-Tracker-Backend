import type { Model, Types } from 'mongoose';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { Photo } from '../models/Photo';
import { ApiError } from '../utils/apiError';
import { assertObjectId } from '../utils/ids';

export type PhotoOwner = 'doctors' | 'patients';

interface RefDoc {
  _id: Types.ObjectId;
  photoId?: Types.ObjectId | null;
  updatedAt: Date;
}

// Both Doctor and Patient expose a `photoId` reference; we keep the model
// reference loose to share one implementation across both entities.
const MODELS: Record<PhotoOwner, Model<unknown>> = {
  doctors: Doctor as unknown as Model<unknown>,
  patients: Patient as unknown as Model<unknown>,
};

const label = (owner: PhotoOwner) => (owner === 'doctors' ? 'Doctor not found' : 'Patient not found');

async function findRef(owner: PhotoOwner, id: string): Promise<RefDoc> {
  assertObjectId(id);
  const doc = (await MODELS[owner].findById(id).select('photoId updatedAt').lean()) as unknown as RefDoc | null;
  if (!doc) throw ApiError.notFound(label(owner));
  return doc;
}

export interface PhotoData {
  data: Buffer;
  contentType: string;
}

/** Returns the stored photo bytes for the entity, or throws a 404 if there is none. */
export async function getPhoto(owner: PhotoOwner, id: string): Promise<PhotoData> {
  const ref = await findRef(owner, id);
  if (!ref.photoId) throw ApiError.notFound('No photo for this record');
  const photo = await Photo.findById(ref.photoId);
  if (!photo) throw ApiError.notFound('No photo for this record');
  return { data: photo.data, contentType: photo.contentType };
}

export interface PhotoMutationResult {
  id: string;
  hasPhoto: boolean;
  updatedAt: Date;
}

export async function setPhoto(
  owner: PhotoOwner,
  id: string,
  file: { buffer: Buffer; mimetype: string },
): Promise<PhotoMutationResult> {
  assertObjectId(id);
  const Model = MODELS[owner];
  const ref = (await Model.findById(id).select('photoId').lean()) as unknown as RefDoc | null;
  if (!ref) throw ApiError.notFound(label(owner));

  const photo = await Photo.create({ data: file.buffer, contentType: file.mimetype });
  const oldPhotoId = ref.photoId;
  await Model.updateOne({ _id: id }, { $set: { photoId: photo._id } });
  if (oldPhotoId) await Photo.findByIdAndDelete(oldPhotoId);

  const updated = (await Model.findById(id).select('updatedAt').lean()) as unknown as RefDoc | null;
  return { id, hasPhoto: true, updatedAt: updated!.updatedAt };
}

export async function removePhoto(owner: PhotoOwner, id: string): Promise<PhotoMutationResult> {
  assertObjectId(id);
  const Model = MODELS[owner];
  const ref = (await Model.findById(id).select('photoId').lean()) as unknown as RefDoc | null;
  if (!ref) throw ApiError.notFound(label(owner));
  if (ref.photoId) {
    await Photo.findByIdAndDelete(ref.photoId);
    await Model.updateOne({ _id: id }, { $unset: { photoId: '' } });
  }
  const updated = (await Model.findById(id).select('updatedAt').lean()) as unknown as RefDoc | null;
  return { id, hasPhoto: false, updatedAt: updated!.updatedAt };
}
