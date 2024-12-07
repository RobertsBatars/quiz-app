import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  path: { type: String, required: true },
  status: { type: String, enum: ['processing', 'completed', 'error'], default: 'processing' },
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export default mongoose.models.Document || mongoose.model('Document', documentSchema);