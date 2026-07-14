import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  refreshToken?: string; // Optional refresh token field
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const removeSensitiveFields = (
  _document: unknown,
  value: Record<string, unknown>
): Record<string, unknown> => {
  delete value.password;
  delete value.refreshToken;
  return value;
};

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
      validate: {
        validator: function (v: string) {
          // Check for at least one number, one symbol, and eight characters
          return /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(v);
        },
        message: () =>
          'Password must contain at least eight characters, one number and one symbol',
      },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: removeSensitiveFields },
    toObject: { transform: removeSensitiveFields },
  }
);

// Add pre-save middleware to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash password with bcrypt with salt rounds of 10
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords using bcrypt
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
