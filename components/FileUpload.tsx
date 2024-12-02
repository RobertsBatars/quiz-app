'use client'

import { useState } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

interface UploadError {
  fileName: string;
  error: string;
  details?: string;
}

export default function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<UploadError[]>([])
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setErrors([])
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setErrors(errors.filter(err => err.fileName !== files[index].name))
  }

  const handleUpload = async () => {
    setUploading(true)
    setProgress(0)
    setErrors([])

    let successCount = 0;
    const newErrors: UploadError[] = [];

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData()
      formData.append('file', files[i])
      formData.append('projectId', projectId)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          headers: {
            // Remove Content-Type header when sending FormData
            // Content-Type will be set automatically including boundary
          },
          body: formData
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          newErrors.push({
            fileName: files[i].name,
            error: data.error || 'Upload failed',
            details: data.details || data.reason
          })
        } else {
          successCount++;
        }

        setProgress(((i + 1) / files.length) * 100)
      } catch (error) {
        console.error('Upload failed:', error)
        newErrors.push({
          fileName: files[i].name,
          error: 'Network error',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setUploading(false)
    setErrors(newErrors)

    if (successCount > 0) {
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}.`,
        variant: 'default'
      })
      
      if (successCount === files.length) {
        setFiles([])
      }

      onUploadComplete?.()
    }

    if (newErrors.length > 0) {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${newErrors.length} file${newErrors.length > 1 ? 's' : ''}.`,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-4">
      <Input
        type="file"
        onChange={handleFileChange}
        multiple
        accept=".pdf,.doc,.docx,.txt"
        disabled={uploading}
      />
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const error = errors.find(err => err.fileName === file.name);
            return (
              <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="flex-1">{file.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{error.error}</AlertTitle>
                      {error.details && (
                        <AlertDescription>{error.details}</AlertDescription>
                      )}
                    </Alert>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Uploading... {Math.round(progress)}%
          </p>
        </div>
      )}
      <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading...' : 'Upload Files'}
      </Button>
    </div>
  )
}
