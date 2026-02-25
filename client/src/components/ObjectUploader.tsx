import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
  accept?: string;
}

/**
 * A file upload component that renders as a button and provides a simple file input.
 * 
 * Features:
 * - Renders as a customizable button that opens a file input
 * - Handles file selection and upload to presigned URLs
 * - Shows upload progress and status
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  accept = "image/*",
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    if (files.length > maxNumberOfFiles) {
      alert(`Maximum ${maxNumberOfFiles} bestand(en) toegestaan`);
      return;
    }

    const file = files[0];
    if (file.size > maxFileSize) {
      alert(`Bestand is te groot. Maximum ${Math.round(maxFileSize / 1024 / 1024)}MB toegestaan`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get upload parameters
      const { url } = await onGetUploadParameters();

      // Upload file
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          onComplete?.({
            successful: [{ uploadURL: url }]
          });
        } else {
          console.error('Upload failed:', xhr.statusText);
          alert('Upload mislukt. Probeer het opnieuw.');
        }
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        console.error('Upload error');
        alert('Upload mislukt. Probeer het opnieuw.');
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload mislukt. Probeer het opnieuw.');
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Reset file input
    event.target.value = '';
  };

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
      <Button 
        onClick={() => document.getElementById('file-upload')?.click()}
        className={buttonClassName}
        disabled={isUploading}
        data-testid="button-upload"
      >
        {isUploading ? (
          <span>{Math.round(uploadProgress)}% uploading...</span>
        ) : (
          children
        )}
      </Button>
    </div>
  );
}
