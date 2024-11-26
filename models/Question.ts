import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  type: { type: String, enum: ['multiple-choice', 'open-ended', 'flashcard'], required: true },
  question: { type: String, required: true },
  options: [String],
  correctAnswer: mongoose.Schema.Types.Mixed,
  explanation: String,
  points: { type: Number, default: 1 },
  aiRubric: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  tags: [String],
  sourceContext: String,
  embeddings: [Number]
}, { timestamps: true });

export default mongoose.models.Question || mongoose.model('Question', questionSchema);