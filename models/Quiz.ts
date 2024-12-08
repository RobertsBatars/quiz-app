import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

// Define question schema as a separate schema
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['multiple-choice', 'open-ended', 'flash-cards', 'oral-exam']
  },
  options: [String],
  correctAnswer: String,
  explanation: String,
  aiRubric: {
    keyPoints: [String],
    scoringCriteria: String
  }
}, { _id: true }); // Enable _id for subdocuments

const quizSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: String,
    type: { 
      type: String, 
      enum: ['multiple-choice', 'open-ended', 'flash-cards', 'oral-exam'],
      required: true 
    },
    questions: [questionSchema], // Now each question will have an _id
    timeLimit: Number,
    passingScore: Number,
    status: { 
      type: String,
      enum: ['draft', 'published', 'archived'],
      required: true
    }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
