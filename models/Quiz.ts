import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

const quizSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['multiple-choice', 'open-ended', 'flashcard', 'oral'], required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  timeLimit: Number,
  passingScore: Number,
  isPublic: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  settings: {
    shuffleQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    allowRetake: { type: Boolean, default: true },
  }
}, { timestamps: true });

export default mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);