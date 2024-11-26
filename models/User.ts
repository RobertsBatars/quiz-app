import mongoose from 'mongoose'

export interface IUser extends mongoose.Document {
  email: string
  password: string
  name: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  projects: mongoose.Types.ObjectId[]
  uploadedFiles: mongoose.Types.ObjectId[]
  quizzes: mongoose.Types.ObjectId[]
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
    isActive: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema)