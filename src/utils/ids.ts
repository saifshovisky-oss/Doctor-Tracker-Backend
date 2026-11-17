import mongoose from 'mongoose';
import { ApiError } from './apiError';

export function assertObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(`Invalid id: ${id}`);
  }
}
