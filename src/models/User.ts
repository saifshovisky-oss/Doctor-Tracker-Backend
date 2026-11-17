import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type UserRole = 'admin';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = IUser & Document;

const userSchema = new Schema<IUser, Model<IUser>>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin'], default: 'admin', immutable: true },
  },
  { timestamps: true, versionKey: false },
);

// Unique email (also serves equality lookups during login).
userSchema.index({ email: 1 }, { unique: true, name: 'user_email_unique' });

userSchema.set('toJSON', {
  transform(_doc, value) {
    const ret = value as unknown as Record<string, unknown>;
    delete ret.password;
    delete ret.__v;
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const User = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema);
