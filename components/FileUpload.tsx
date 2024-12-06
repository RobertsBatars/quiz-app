'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export default function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function handleUpload(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setUploading(true);

    try {
      const formData = new FormData(evt.currentTarget);
      formData.append('projectId', projectId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });

      onUploadComplete?.();

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <Input 
        type="file" 
        name="file"
        accept=".pdf,.doc,.docx,.txt"
        disabled={uploading}
      />
      <Button type="submit" disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading...' : 'Upload File'}
      </Button>
    </form>
  );
}
