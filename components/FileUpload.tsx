'use client'

import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

interface FileUploadProps {
  projectId: string;
}

export default function FileUpload({ projectId }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    setUploading(true)
    setProgress(0)

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData()
      formData.append('file', files[i])
      formData.append('projectId', projectId)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error('Upload failed')
        }

        setProgress(((i + 1) / files.length) * 100)
      } catch (error) {
        console.error('Upload failed:', error)
        // In a real app, show an error message to the user
      }
    }

    setUploading(false)
    setFiles([])
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
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
              <span>{file.name}</span>
              <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {uploading && <Progress value={progress} className="w-full" />}
      <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
        <Upload className="mr-2 h-4 w-4" /> Upload Files
      </Button>
    </div>
  )
}

