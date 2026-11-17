import type { Request, Response } from 'express';
import { getPhoto, removePhoto, setPhoto, type PhotoOwner } from '../services/photo.service';
import { asyncHandler } from '../utils/asyncHandler';

/** Stream the stored photo bytes for a doctor or patient. Sends a 404 (image fails to load) when there is none. */
export const getPhotoController =
  (owner: PhotoOwner) =>
  asyncHandler(async (req: Request, res: Response) => {
    const photo = await getPhoto(owner, req.params.id!);
    res.set('Content-Type', photo.contentType);
    // private so the browser/proxy caches per-session; the frontend appends a
    // cache-busting query param when the record changes.
    res.set('Cache-Control', 'private, max-age=3600, must-revalidate');
    res.send(photo.data);
  });

export const uploadPhotoController =
  (owner: PhotoOwner) =>
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new Error('No file uploaded');
    const result = await setPhoto(owner, req.params.id!, { buffer: file.buffer, mimetype: file.mimetype });
    res.status(200).json({ success: true, data: result, message: 'Photo updated' });
  });

export const deletePhotoController =
  (owner: PhotoOwner) =>
  asyncHandler(async (req: Request, res: Response) => {
    const result = await removePhoto(owner, req.params.id!);
    res.status(200).json({ success: true, data: result, message: 'Photo removed' });
  });
