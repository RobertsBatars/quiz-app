import mongoose from 'mongoose'
import { connectToDatabase } from '@/lib/mongoose'

// Ensure database connection with correct database name
await connectToDatabase()

export interface IUser extends mongoose.Document {
  email: string
  password: string
  name: string
  role: 'user' | 'admin'
  status: 'active' | 'banned' | 'deleted'
  lastLogin: Date
  loginAttempts: number
  lockUntil: Date
  createdAt: Date
  updatedAt: Date
  projects: mongoose.Types.ObjectId[]
  uploadedFiles: mongoose.Types.ObjectId[]
  quizzes: mongoose.Types.ObjectId[]
  settings: {
    emailNotifications: boolean
    twoFactorEnabled: boolean
    theme: 'light' | 'dark' | 'system'
  }
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'banned', 'deleted'],
      default: 'active',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    }],
    uploadedFiles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
    }],
    quizzes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
    }],
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema)