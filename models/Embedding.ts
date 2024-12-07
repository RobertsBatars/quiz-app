import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

export interface IEmbedding extends mongoose.Document {
  documentId: mongoose.Types.ObjectId;
  content: string;
  embedding: number[];
  chunkIndex: number;
  projectId: mongoose.Types.ObjectId;
}

const embeddingSchema = new mongoose.Schema<IEmbedding>({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  content: { type: String, required: true },
  embedding: {
    type: [Number],
    validate: {
      validator: function(v: number[]) {
        return !v || v.length === 1536;
      },
      message: 'Embeddings must be 1536-dimensional vectors'
    },
    required: true
  },
  chunkIndex: { type: Number, required: true }
}, { timestamps: true });

// Create compound index for efficient querying
embeddingSchema.index({ documentId: 1, chunkIndex: 1 });
embeddingSchema.index({ projectId: 1 });

export default mongoose.models.Embedding || mongoose.model<IEmbedding>('Embedding', embeddingSchema);