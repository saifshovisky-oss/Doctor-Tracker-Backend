import mongoose, { Schema, type Model, type Types } from 'mongoose';

export interface IDoctor {
  name: string;
  specialization: string[];
  hospital: string;
  phone: string;
  email: string;
  photoId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const doctorFields = 'name specialization hospital phone email photoId createdAt updatedAt';

const doctorSchema = new Schema<IDoctor, Model<IDoctor>>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
    specialization: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      required: [true, 'At least one specialization is required'],
      validate: {
        validator: (values: string[]) => Array.isArray(values) && values.length > 0 && values.every((value) => value.trim().length > 0),
        message: 'At least one specialization is required',
      },
    },
    hospital: { type: String, required: [true, 'Hospital is required'], trim: true, maxlength: 180 },
    phone: { type: String, required: [true, 'Phone is required'], trim: true, maxlength: 40 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    photoId: { type: Schema.Types.ObjectId, ref: 'Photo', default: undefined, index: true },
  },
  { timestamps: true, versionKey: false },
);

doctorSchema.index({ email: 1 }, { unique: true, name: 'doctor_email_unique' });
doctorSchema.index({ name: 'text', email: 'text', hospital: 'text', specialization: 'text' }, {
  name: 'doctor_search_text',
  weights: { name: 5, email: 2, hospital: 2, specialization: 2 },
});
doctorSchema.index({ specialization: 1, createdAt: -1 }, { name: 'doctor_spec_created' });
doctorSchema.index({ createdAt: -1 }, { name: 'doctor_created' });

doctorSchema.set('toJSON', {
  transform(_doc, value) {
    const ret = value as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Doctor = (mongoose.models.Doctor as Model<IDoctor>) || mongoose.model<IDoctor>('Doctor', doctorSchema);
