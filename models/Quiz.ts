import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

// Define question schema as a separate schema
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { type: String, required: true },
  options: [String],
  correctAnswer: String,
  explanation: String,
  aiRubric: {
    keyPoints: [String],
    scoringCriteria: String
  }
}, { _id: false }); // Disable _id for subdocuments

const quizSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['multiple-choice', 'open-ended', 'flash-cards', 'oral-exam'],
    required: true 
  },
  questions: [questionSchema],
  status: { 
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }
}, { 
  timestamps: true 
});

export default mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
