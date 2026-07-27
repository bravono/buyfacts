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
import styles from './FileUploader.module.css';

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
  const [selectedMediaType, setSelectedMediaType] = useState<'video' | 'image' | 'audio' | 'pdf'>('video');

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

      // Auto-detect media type
      const mime = file.type || '';
      const name = file.name.toLowerCase();
      if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)) {
        setSelectedMediaType('image');
      } else if (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv)$/i.test(name)) {
        setSelectedMediaType('video');
      } else if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)) {
        setSelectedMediaType('audio');
      } else if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
        setSelectedMediaType('pdf');
      } else {
        setSelectedMediaType('video'); // default fallback
      }
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
          let errorMsg = `MinIO Upload failed with HTTP status ${xhr.status}.`;
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xhr.responseText, 'text/xml');
            const code = xmlDoc.getElementsByTagName('Code')[0]?.textContent;
            const message = xmlDoc.getElementsByTagName('Message')[0]?.textContent;
            if (code && message) {
              errorMsg = `${code}: ${message}`;
            }
          } catch (_) {}
          reject(new Error(errorMsg));
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
          let errorMsg = `Server upload failed with status ${xhr.status}.`;
          try {
            const errData = JSON.parse(xhr.responseText);
            if (errData.error) {
              errorMsg = errData.error;
            }
          } catch (_) {}
          reject(new Error(errorMsg));
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

      const finalResult = {
        ...result,
        fileType: selectedMediaType,
      };

      setUploadResult(finalResult);
      if (onUploadSuccess) {
        onUploadSuccess(finalResult);
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
    <div className={`${styles.uploaderContainer} ${className}`}>
      {/* Container Card */}
      <div className={styles.uploadCard}>
        
        {/* Header Section */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h3>
              <UploadCloud className="w-5 h-5" />
              File Ingestion
            </h3>
            <p>
              Direct browser upload to S3-compatible cloud storage
            </p>
          </div>

          {/* Mode Selector */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              onClick={() => setUploadMethod('presigned')}
              className={`${styles.toggleBtn} ${uploadMethod === 'presigned' ? styles.toggleBtnActive : ''}`}
              title="Uploads directly from browser to MinIO using S3 presigned URL"
            >
              <Zap className="w-3.5 h-3.5" />
              Direct PUT
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('server')}
              className={`${styles.toggleBtn} ${uploadMethod === 'server' ? styles.toggleBtnActive : ''}`}
              title="Streams upload through Next.js Server Route Handler"
            >
              <Server className="w-3.5 h-3.5" />
              Server Route
            </button>
          </div>
        </div>

        {/* Successful Upload State */}
        {uploadResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className={styles.successBanner}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <h4 className={styles.successTitle}>Upload Successful</h4>
                <p className={styles.successText}>File is stored in MinIO and accessible via public URL.</p>
              </div>
            </div>

            {/* Direct Rich Preview Component */}
            <FilePreview
              url={uploadResult.publicUrl}
              fileName={uploadResult.fileName}
              fileType={uploadResult.fileType}
              fileSize={uploadResult.fileSize}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary text-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw className="w-4 h-4" /> Upload Another File
              </button>
            </div>
          </div>
        ) : (
          /* Form & Dropzone State */
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
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

              <div className={styles.iconCircle}>
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <p className={styles.dropzoneTitle}>
                  {dragActive ? 'Drop your file here...' : 'Click to upload or drag & drop'}
                </p>
                <p className={styles.dropzoneSubtitle}>
                  Supports Images, Videos, Audio, PDFs & Documents (Max 100MB)
                </p>
              </div>
            </div>

            {/* Validation Error Message */}
            {errors.file && (
              <div className={styles.errorBox}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <div className={styles.errorTitle}>Validation Error</div>
                  <div>{errors.file.message}</div>
                </div>
              </div>
            )}

            {/* Selected File Card */}
            {selectedFile && !uploadResult && (
              <div className={styles.fileCard}>
                <div className={styles.fileCardInfo}>
                  <div className={styles.fileIconWrapper}>
                    <FileIcon className="w-4 h-4" />
                  </div>
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName} title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className={styles.fileSize}>
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
                    className={styles.removeBtn}
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Media Type Override Selector */}
            {selectedFile && !uploadResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-color)', letterSpacing: '0.05em' }}>
                  Choose Media Category
                </label>
                <select
                  value={selectedMediaType}
                  onChange={(e) => setSelectedMediaType(e.target.value as any)}
                  disabled={isUploading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    color: 'var(--text-color)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="video">🎞️ Video (MP4/WebM)</option>
                  <option value="image">🖼️ Image (PNG/JPEG/SVG/WebP)</option>
                  <option value="audio">🎵 Audio (MP3/WAV)</option>
                  <option value="pdf">📄 PDF Document</option>
                </select>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressIndicator}>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--interactive-orange)' }} />
                    Uploading to MinIO...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* General Error Display */}
            {uploadError && (
              <div className={styles.errorBox}>
                <AlertCircle className="w-4 h-4 shrink-0" style={{ marginTop: '0.15rem' }} />
                <div>
                  <p className={styles.errorTitle}>Upload Failed</p>
                  <p>{uploadError}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div style={{ paddingTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem'
                }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    Upload Media <ArrowRight className="w-4 h-4" />
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
