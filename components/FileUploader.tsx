'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UploadCloud,
  File as FileIcon,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Server,
  ArrowRight,
} from 'lucide-react';
import { FilePreview } from './FilePreview';

// 100MB File Size Limit in Bytes
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

// Allowed file types: Images, Videos, Audio, PDFs, Office Documents, Text, Archives
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'mp4', 'webm', 'ogg', 'mov', 'mkv',
  'mp3', 'wav', 'aac', 'flac', 'm4a',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'
];

/**
 * Zod validation schema for file selection
 */
const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Please select a file to upload.' })
    .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
      message: `File size exceeds the 100MB limit. Please select a smaller file.`,
    })
    .refine(
      (file) => {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
        const isAllowedExt = ALLOWED_EXTENSIONS.includes(fileExt);
        return isAllowedMime || isAllowedExt;
      },
      {
        message: 'Unsupported file type. Allowed formats: images, videos, audio, PDFs, documents, archives.',
      }
    ),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export interface UploadSuccessResult {
  publicUrl: string;
  objectKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface FileUploaderProps {
  /** Callback fired upon successful upload with the returned public URL and file details */
  onUploadSuccess?: (result: UploadSuccessResult) => void;
  /** Subfolder prefix inside MinIO bucket (default: 'uploads') */
  folderPrefix?: string;
  /** Custom container class */
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  folderPrefix = 'uploads',
  className = '',
}) => {
  // State variables
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadSuccessResult | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'presigned' | 'server'>('presigned');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // React Hook Form initialization
  const {
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  });

  // Handle file selection from input or dropzone
  const handleFileChange = useCallback((file: File | null) => {
    setUploadError(null);
    setUploadProgress(0);
    setUploadResult(null);

    if (file) {
      setSelectedFile(file);
      setValue('file', file, { shouldValidate: true });
    } else {
      setSelectedFile(null);
      setValue('file', null as any, { shouldValidate: true });
    }
  }, [setValue]);

  // Drag and Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileChange(droppedFile);
    }
  }, [handleFileChange]);

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValue('file', null as any);
    clearErrors('file');
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Performs file upload using Presigned PUT URL with XMLHttpRequest to track real-time progress
   */
  const uploadViaPresignedUrl = async (file: File): Promise<UploadSuccessResult> => {
    // Step 1: Request presigned URL from API Route
    const res = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        prefix: folderPrefix,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to request presigned upload URL.');
    }

    const { uploadUrl, publicUrl, objectKey } = await res.json();

    // Step 2: Upload file directly to MinIO using XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            publicUrl,
            objectKey,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
          });
        } else {
          reject(new Error(`MinIO Upload failed with HTTP status ${xhr.status}. Check CORS settings.`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error or CORS violation occurred during MinIO direct upload.'));
      };

      xhr.onabort = () => {
        reject(new Error('Upload was cancelled.'));
      };

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  };

  /**
   * Fallback method: Direct multipart upload via Next.js server route
   */
  const uploadViaServer = async (file: File): Promise<UploadSuccessResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prefix', folderPrefix);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              publicUrl: data.publicUrl,
              objectKey: data.objectKey,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size,
            });
          } catch (e) {
            reject(new Error('Failed to parse server upload response.'));
          }
        } else {
          reject(new Error(`Server upload failed with status ${xhr.status}.`));
        }
      };

      xhr.onerror = () => reject(new Error('Server upload network error.'));
      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    });
  };

  // Main Submit Handler
  const onSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      let result: UploadSuccessResult;
      if (uploadMethod === 'presigned') {
        try {
          result = await uploadViaPresignedUrl(selectedFile);
        } catch (presignErr: any) {
          console.warn('Presigned upload failed, attempting fallback to direct server upload:', presignErr);
          // Fallback automatically to server route if presigned upload fails (e.g. CORS)
          result = await uploadViaServer(selectedFile);
        }
      } else {
        result = await uploadViaServer(selectedFile);
      }

      setUploadResult(result);
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      xhrRef.current = null;
    }
  };

  const handleReset = () => {
    handleRemoveFile();
    setUploadResult(null);
    setUploadError(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-6 ${className}`}>
      {/* Container Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] space-y-6 shadow-xl relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-color)] flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-[var(--interactive-orange)]" />
              MinIO File Uploader
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Upload images, videos, audio, PDFs & docs up to 100MB
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-[var(--bg-alt)] p-1 rounded-lg border border-[var(--border-color)] text-xs">
            <button
              type="button"
              onClick={() => setUploadMethod('presigned')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                uploadMethod === 'presigned'
                  ? 'bg-white dark:bg-zinc-800 text-[var(--interactive-orange)] shadow-sm font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
              }`}
              title="Uploads directly from browser to MinIO using S3 presigned URL"
            >
              <Zap className="w-3.5 h-3.5" />
              Presigned PUT
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('server')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                uploadMethod === 'server'
                  ? 'bg-white dark:bg-zinc-800 text-[var(--interactive-orange)] shadow-sm font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
              }`}
              title="Streams upload through Next.js Server Route Handler"
            >
              <Server className="w-3.5 h-3.5" />
              Server Route
            </button>
          </div>
        </div>

        {/* Successful Upload State */}
        {uploadResult ? (
          <div className="space-y-6 animate-fade-in-up">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Upload Successful!</h4>
                <p className="text-xs opacity-90">File is stored in MinIO and accessible via public URL.</p>
              </div>
            </div>

            {/* Direct Rich Preview Component */}
            <FilePreview
              url={uploadResult.publicUrl}
              fileName={uploadResult.fileName}
              fileType={uploadResult.fileType}
              fileSize={uploadResult.fileSize}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Upload Another File
              </button>
            </div>
          </div>
        ) : (
          /* Form & Dropzone State */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-[var(--interactive-orange)] bg-[var(--interactive-orange)]/10 scale-[1.01]'
                  : 'border-[var(--border-color)] hover:border-[var(--interactive-orange)] hover:bg-[var(--bg-alt)]'
              } ${selectedFile ? 'bg-[var(--bg-alt)]/50' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 rounded-2xl bg-[var(--interactive-blue)]/10 text-[var(--interactive-blue)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <UploadCloud className="w-8 h-8 text-[var(--interactive-orange)]" />
              </div>

              <div>
                <p className="font-semibold text-base text-[var(--text-color)]">
                  {dragActive ? 'Drop your file here...' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Supports Images, MP4/WebM Videos, MP3 Audio, PDFs, Office files & ZIP (Max 100MB)
                </p>
              </div>
            </div>

            {/* Validation Error Message */}
            {errors.file && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.file.message}</span>
              </div>
            )}

            {/* Selected File Card */}
            {selectedFile && !uploadResult && (
              <div className="p-4 bg-[var(--bg-alt)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-[var(--interactive-orange)]/10 text-[var(--interactive-orange)] rounded-lg shrink-0">
                    <FileIcon className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold truncate text-[var(--text-color)]" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatBytes(selectedFile.size)} • {selectedFile.type || 'Unknown MIME'}
                    </p>
                  </div>
                </div>

                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[var(--text-color)]">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--interactive-orange)]" />
                    Uploading to MinIO...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-3 bg-[var(--border-color)] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--interactive-blue)] to-[var(--interactive-orange)] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* General Error Display */}
            {uploadError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Upload Failed</p>
                  <p>{uploadError}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full btn btn-primary py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    Upload to MinIO <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
