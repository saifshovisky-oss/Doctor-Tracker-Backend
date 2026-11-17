import mongoose, { Schema, type Model, type Types } from 'mongoose';

export type Gender = 'male' | 'female' | 'other';

export interface IPatient {
  name: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  email?: string;
  condition: string;
  doctorId: Types.ObjectId;
  photoId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const patientFields = 'name age gender phone email condition doctorId photoId notes createdAt updatedAt';

const patientSchema = new Schema<IPatient, Model<IPatient>>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: { type: String, trim: true, maxlength: 40, default: undefined },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: undefined },
    condition: { type: String, required: [true, 'Condition is required'], trim: true, maxlength: 150 },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    photoId: { type: Schema.Types.ObjectId, ref: 'Photo', default: undefined, index: true },
    notes: { type: String, trim: true, maxlength: 2000, default: undefined },
  },
  { timestamps: true, versionKey: false },
);

patientSchema.index({ doctorId: 1, createdAt: -1 }, { name: 'patient_doctor_created' });
patientSchema.index({ condition: 1, createdAt: -1 }, { name: 'patient_condition_created' });
patientSchema.index({ createdAt: -1 }, { name: 'patient_created' });
patientSchema.index({ name: 1 }, { name: 'patient_name' });

patientSchema.set('toJSON', {
  transform(_doc, value) {
    const ret = value as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    ret.doctorId = String(ret.doctorId);
    delete ret._id;
    return ret;
  },
});

export const Patient = (mongoose.models.Patient as Model<IPatient>) || mongoose.model<IPatient>('Patient', patientSchema);
