import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
  path: { type: String, required: true },
  embeddings: [{ type: Number }],
  status: { type: String, enum: ['processing', 'completed', 'error'], default: 'processing' },
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  moderationReason: String,
}, { timestamps: true });

export default mongoose.models.Document || mongoose.model('Document', documentSchema);