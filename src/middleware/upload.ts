import multer from 'multer';
import { ApiError } from '../utils/apiError';

/**
 * Accept a single image upload under the form field `photo`. We keep the file
 * in memory (no disk writes) so it can be streamed straight into MongoDB,
 * which also avoids the Render ephemeral-filesystem problem.
 */
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP or GIF images are allowed'));
  },
}).single('photo');

/** Wrapper that converts multer errors into ApiError failures for the error middleware. */
export function photoUploadMiddleware(
  req: Parameters<typeof uploadPhoto>[0],
  res: Parameters<typeof uploadPhoto>[1],
  next: Parameters<typeof uploadPhoto>[2],
): void {
  uploadPhoto(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    const sizeLimit = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
    const message = sizeLimit
      ? 'Image is too large (max 2 MB)'
      : err instanceof Error
        ? err.message
        : 'Upload failed';
    next(sizeLimit ? new ApiError(413, message) : ApiError.badRequest(message));
  });
}

