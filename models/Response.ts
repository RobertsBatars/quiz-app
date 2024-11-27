import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

const responseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    score: Number,
    aiGradingFeedback: String,
    timeSpent: Number
  }],
  totalScore: Number,
  percentageScore: Number,
  startTime: { type: Date, required: true },
  endTime: Date,
  status: { type: String, enum: ['in-progress', 'completed', 'abandoned'], default: 'in-progress' },
  oralExamRecording: String
}, { timestamps: true });

export default mongoose.models.Response || mongoose.model('Response', responseSchema);