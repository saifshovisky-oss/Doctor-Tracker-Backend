import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Managed catalog of medical conditions. Patients still store their condition
 * as a denormalized string for resilience, but this catalog drives the
 * suggestion list in the patient form and a dedicated management page.
 *
 * `key` is the case-insensitive uniqueness anchor (lowercased trimmed name).
 */
export interface ICondition {
  name: string;
  key: string;
  createdAt: Date;
  updatedAt: Date;
}

const conditionSchema = new Schema<ICondition, Model<ICondition>>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
    key: { type: String, required: true, unique: true },
  },
  { timestamps: true, versionKey: false },
);

conditionSchema.index({ name: 1 });
conditionSchema.index({ createdAt: -1 }, { name: 'condition_created' });

conditionSchema.set('toJSON', {
  transform(_doc, value) {
    const ret = value as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.key;
    return ret;
  },
});

export const Condition =
  (mongoose.models.Condition as Model<ICondition>) || mongoose.model<ICondition>('Condition', conditionSchema);
