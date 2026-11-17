import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Stores binary image data in a separate collection so the heavy buffers are
 * never loaded by the list/detail aggregations of Doctors and Patients —
 * those documents only carry a lightweight `photoId` reference.
 *
 * Chosen over the local filesystem because the production backend runs on
 * Render, whose filesystem is ephemeral and would lose uploads on redeploy.
 */
export interface IPhoto {
  data: Buffer;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
}

const photoSchema = new Schema<IPhoto, Model<IPhoto>>(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const Photo = (mongoose.models.Photo as Model<IPhoto>) || mongoose.model<IPhoto>('Photo', photoSchema);
