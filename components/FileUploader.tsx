'use client';

import React, { useState, useRef, useCallback } from 'react';
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
  Folder,
  Layers,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  ExternalLink,
} from 'lucide-react';
import { FilePreview } from './FilePreview';
import { sanitizeFolderPrefix } from '@/lib/minio';
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

export interface UploadSuccessResult {
  publicUrl: string;
  objectKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export type QueueItemStatus = 'ready' | 'uploading' | 'success' | 'error';

export interface QueueItem {
  id: string;
  file: File;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  result?: UploadSuccessResult;
  mediaType: 'video' | 'image' | 'audio' | 'pdf';
}

interface FileUploaderProps {
  /** Callback fired upon successful upload with the returned public URL and file details */
  onUploadSuccess?: (result: UploadSuccessResult) => void;
  /** Callback fired when all batch uploads finish with all successful results */
  onBatchUploadSuccess?: (results: UploadSuccessResult[]) => void;
  /** Initial subfolder prefix inside MinIO bucket (default: 'uploads') */
  folderPrefix?: string;
  /** Custom container class */
  className?: string;
}

const PRESET_FOLDERS = [
  { value: 'products-services', label: 'Products & Services' },
  { value: 'research-imperatives', label: 'Research Imperatives' },
  { value: 'cubicon', label: 'Cubicon' },
  { value: 'research-lib', label: 'Research Lib' },
  { value: 'triad', label: 'Triad' },
  { value: 'rule-of-three', label: 'Rule of Three' },
  { value: 'uploads', label: 'Uploads' },
  { value: 'custom', label: 'Custom folder...' },
];

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onBatchUploadSuccess,
  folderPrefix = 'uploads',
  className = '',
}) => {
  // Folder destination state
  const [folderPreset, setFolderPreset] = useState<string>(() => {
    const matched = PRESET_FOLDERS.find((p) => p.value === folderPrefix);
    return matched ? matched.value : 'custom';
  });
  const [customFolder, setCustomFolder] = useState<string>(folderPrefix);

  // Computed destination folder
  const activeDestinationFolder = folderPreset === 'custom'
    ? sanitizeFolderPrefix(customFolder)
    : folderPreset;

  // Upload method
  const [uploadMethod, setUploadMethod] = useState<'presigned' | 'server'>('presigned');

  // Drag and drop & Queue state
  const [dragActive, setDragActive] = useState(false);
  const [fileQueue, setFileQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<UploadSuccessResult[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<{ [id: string]: XMLHttpRequest }>({});

  const detectMediaType = (file: File): 'video' | 'image' | 'audio' | 'pdf' => {
    const mime = file.type || '';
    const name = file.name.toLowerCase();
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)) {
      return 'image';
    } else if (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv)$/i.test(name)) {
      return 'video';
    } else if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)) {
      return 'audio';
    } else if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
      return 'pdf';
    }
    return 'video';
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File exceeds maximum limit of 100MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
    }
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) => file.type && file.type.startsWith(prefix));
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(fileExt);
    if (!isAllowedMime && !isAllowedExt) {
      return 'Unsupported file format.';
    }
    return null;
  };

  // Add files to queue
  const addFilesToQueue = useCallback((newFiles: FileList | File[]) => {
    setGlobalError(null);
    setBatchResults(null);

    const itemsToAdd: QueueItem[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        itemsToAdd.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          status: 'ready',
          progress: 0,
          mediaType: detectMediaType(file),
        });
      }
    });

    if (errors.length > 0) {
      setGlobalError(errors.join(' | '));
    }

    if (itemsToAdd.length > 0) {
      setFileQueue((prev) => [...prev, ...itemsToAdd]);
    }
  }, []);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  }, [addFilesToQueue]);

  const handleRemoveFromQueue = (id: string) => {
    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
      delete abortControllersRef.current[id];
    }
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearQueue = () => {
    Object.values(abortControllersRef.current).forEach((xhr) => xhr.abort());
    abortControllersRef.current = {};
    setFileQueue([]);
    setGlobalError(null);
    setBatchResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
    setFileQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  /**
   * Uploads single file via Presigned PUT URL
   */
  const uploadSinglePresigned = async (item: QueueItem, folder: string): Promise<UploadSuccessResult> => {
    // Step 1: Request presigned URL
    const res = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: item.file.name,
        fileType: item.file.type || 'application/octet-stream',
        fileSize: item.file.size,
        prefix: folder,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to request presigned upload URL.');
    }

    const { uploadUrl, publicUrl, objectKey } = await res.json();

    // Step 2: Stream file directly to MinIO
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      abortControllersRef.current[item.id] = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          updateItem(item.id, { progress: percent });
        }
      };

      xhr.onload = () => {
        delete abortControllersRef.current[item.id];
        if (xhr.status >= 200 && xhr.status < 300) {
          const result: UploadSuccessResult = {
            publicUrl,
            objectKey,
            fileName: item.file.name,
            fileType: item.mediaType,
            fileSize: item.file.size,
          };
          resolve(result);
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xhr.responseText, 'text/xml');
            const code = xmlDoc.getElementsByTagName('Code')[0]?.textContent;
            const message = xmlDoc.getElementsByTagName('Message')[0]?.textContent;
            if (code && message) errorMsg = `${code}: ${message}`;
          } catch (_) {}
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        delete abortControllersRef.current[item.id];
        reject(new Error('Network error or CORS violation occurred during direct upload.'));
      };

      xhr.onabort = () => {
        delete abortControllersRef.current[item.id];
        reject(new Error('Upload cancelled.'));
      };

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
      xhr.send(item.file);
    });
  };

  /**
   * Uploads single file via Server Route
   */
  const uploadSingleServer = async (item: QueueItem, folder: string): Promise<UploadSuccessResult> => {
    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('prefix', folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      abortControllersRef.current[item.id] = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          updateItem(item.id, { progress: percent });
        }
      };

      xhr.onload = () => {
        delete abortControllersRef.current[item.id];
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const result: UploadSuccessResult = {
              publicUrl: data.publicUrl,
              objectKey: data.objectKey,
              fileName: item.file.name,
              fileType: item.mediaType,
              fileSize: item.file.size,
            };
            resolve(result);
          } catch {
            reject(new Error('Failed to parse server upload response.'));
          }
        } else {
          let errorMsg = `Server upload failed with status ${xhr.status}`;
          try {
            const errData = JSON.parse(xhr.responseText);
            if (errData.error) errorMsg = errData.error;
          } catch (_) {}
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        delete abortControllersRef.current[item.id];
        reject(new Error('Server upload network error.'));
      };

      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    });
  };

  // Upload Batch
  const handleUploadAll = async () => {
    if (fileQueue.length === 0 || isUploading) return;

    setIsUploading(true);
    setGlobalError(null);
    setBatchResults(null);

    const itemsToUpload = fileQueue.filter((item) => item.status !== 'success');
    const successfulResults: UploadSuccessResult[] = [];
    const destination = activeDestinationFolder;

    // Concurrency pool (up to 3 parallel uploads)
    const CONCURRENCY = 3;
    let index = 0;

    const runWorker = async () => {
      while (index < itemsToUpload.length) {
        const currentItem = itemsToUpload[index];
        index++;

        updateItem(currentItem.id, { status: 'uploading', progress: 0, error: undefined });

        try {
          let result: UploadSuccessResult;
          if (uploadMethod === 'presigned') {
            result = await uploadSinglePresigned(currentItem, destination);
          } else {
            result = await uploadSingleServer(currentItem, destination);
          }

          updateItem(currentItem.id, { status: 'success', progress: 100, result });
          successfulResults.push(result);

          if (onUploadSuccess) {
            onUploadSuccess(result);
          }
        } catch (err: any) {
          console.error(`Error uploading ${currentItem.file.name}:`, err);
          updateItem(currentItem.id, {
            status: 'error',
            error: err.message || 'Upload failed',
          });
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, itemsToUpload.length) }, () =>
      runWorker()
    );

    await Promise.all(workers);

    setIsUploading(false);

    if (successfulResults.length > 0) {
      setBatchResults(successfulResults);
      if (onBatchUploadSuccess) {
        onBatchUploadSuccess(successfulResults);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Film className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      default: return <FileIcon className="w-4 h-4" />;
    }
  };

  const totalUploaded = fileQueue.filter((i) => i.status === 'success').length;
  const overallProgress = fileQueue.length > 0
    ? Math.round(fileQueue.reduce((acc, curr) => acc + curr.progress, 0) / fileQueue.length)
    : 0;

  return (
    <div className={`${styles.uploaderContainer} ${className}`}>
      <div className={styles.uploadCard}>
        {/* Header Section */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h3>
              <UploadCloud className="w-5 h-5" />
              File Ingestion & Batch Uploader
            </h3>
            <p>
              Direct batch upload to S3-compatible cloud storage with custom destination folders
            </p>
          </div>

          {/* Mode Selector */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              onClick={() => setUploadMethod('presigned')}
              className={`${styles.toggleBtn} ${uploadMethod === 'presigned' ? styles.toggleBtnActive : ''}`}
              title="Uploads directly from browser to MinIO using S3 presigned PUT URL"
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

        {/* Destination Folder Configuration */}
        <div className={styles.folderSection}>
          <div className={styles.folderHeader}>
            <div className={styles.folderLabel}>
              <Folder className="w-4 h-4 text-[var(--interactive-orange)]" /> Destination Folder
            </div>
            <div className={styles.folderPathBadge} title={`Target prefix: ${activeDestinationFolder}`}>
              /{activeDestinationFolder}
            </div>
          </div>

          <div className={styles.folderControls}>
            <select
              value={folderPreset}
              onChange={(e) => {
                const val = e.target.value;
                setFolderPreset(val);
                if (val !== 'custom') {
                  setCustomFolder(val);
                }
              }}
              disabled={isUploading}
              className={styles.folderSelect}
            >
              {PRESET_FOLDERS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>

            <div className={styles.folderInputWrapper}>
              <Folder className={`w-3.5 h-3.5 ${styles.folderInputIcon}`} />
              <input
                type="text"
                value={customFolder}
                onChange={(e) => {
                  setCustomFolder(e.target.value);
                  setFolderPreset('custom');
                }}
                disabled={isUploading}
                placeholder="e.g. cubicon/models, media/2026/q1"
                className={styles.folderInput}
              />
            </div>
          </div>
        </div>

        {/* Successful Batch Banner */}
        {batchResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.successBanner}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <h4 className={styles.successTitle}>Batch Upload Complete</h4>
                <p className={styles.successText}>
                  Successfully uploaded {batchResults.length} object{batchResults.length > 1 ? 's' : ''} to /{activeDestinationFolder}.
                </p>
              </div>
            </div>

            {/* If single file uploaded, display rich preview */}
            {batchResults.length === 1 && (
              <FilePreview
                url={batchResults[0].publicUrl}
                fileName={batchResults[0].fileName}
                fileType={batchResults[0].fileType}
                fileSize={batchResults[0].fileSize}
              />
            )}

            {/* If multiple files, display summary items */}
            {batchResults.length > 1 && (
              <div className={styles.batchSummaryList}>
                {batchResults.map((res, idx) => (
                  <div key={idx} className={styles.batchSummaryItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div style={{ overflow: 'hidden' }}>
                        <div className={styles.batchSummaryName} title={res.fileName}>
                          {res.fileName}
                        </div>
                        <div className={styles.batchSummaryKey}>
                          {res.objectKey}
                        </div>
                      </div>
                    </div>
                    <a
                      href={res.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary text-xs"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem' }}
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleClearQueue}
                className="btn btn-secondary text-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw className="w-4 h-4" /> Upload More Files
              </button>
            </div>
          </div>
        )}

        {/* Upload Dropzone & Queue Form */}
        {!batchResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Dropzone */}
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
                multiple
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addFilesToQueue(e.target.files);
                  }
                }}
              />

              <div className={styles.iconCircle}>
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <p className={styles.dropzoneTitle}>
                  {dragActive ? 'Drop files here...' : 'Click to select or drag & drop files'}
                </p>
                <p className={styles.dropzoneSubtitle}>
                  Supports single or batch upload (Images, Videos, Audio, PDFs, Max 100MB each)
                </p>
              </div>
            </div>

            {/* Global Error Banner */}
            {globalError && (
              <div className={styles.errorBox}>
                <AlertCircle className="w-4 h-4 shrink-0" style={{ marginTop: '0.15rem' }} />
                <div>
                  <p className={styles.errorTitle}>Validation Notice</p>
                  <p>{globalError}</p>
                </div>
              </div>
            )}

            {/* Batch File Queue Section */}
            {fileQueue.length > 0 && (
              <div className={styles.queueSection}>
                <div className={styles.queueHeader}>
                  <div className={styles.queueTitle}>
                    <Layers className="w-4 h-4 text-[var(--interactive-blue)]" />
                    Selected Files ({fileQueue.length})
                  </div>
                  {!isUploading && (
                    <div className={styles.queueActions}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.queueBtnText}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add more
                      </button>
                      <button
                        type="button"
                        onClick={handleClearQueue}
                        className={styles.queueBtnText}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#EF4444' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear all
                      </button>
                    </div>
                  )}
                </div>

                {/* Queue List */}
                <div className={styles.queueList}>
                  {fileQueue.map((item) => (
                    <div key={item.id} className={styles.queueItem}>
                      <div className={styles.queueItemContent}>
                        <div className={styles.queueItemLeft}>
                          <div className={styles.queueItemThumb}>
                            {getMediaIcon(item.mediaType)}
                          </div>
                          <div className={styles.queueItemMeta}>
                            <div className={styles.queueItemName} title={item.file.name}>
                              {item.file.name}
                            </div>
                            <div className={styles.queueItemDetails}>
                              <span>{formatBytes(item.file.size)}</span>
                              <span>•</span>
                              <select
                                value={item.mediaType}
                                onChange={(e) =>
                                  updateItem(item.id, { mediaType: e.target.value as any })
                                }
                                disabled={isUploading || item.status === 'success'}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <option value="video">Video</option>
                                <option value="image">Image</option>
                                <option value="audio">Audio</option>
                                <option value="pdf">PDF</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className={styles.queueItemRight}>
                          {item.status === 'ready' && (
                            <span className={`${styles.statusBadge} ${styles.statusBadgeReady}`}>
                              Ready
                            </span>
                          )}
                          {item.status === 'uploading' && (
                            <span className={`${styles.statusBadge} ${styles.statusBadgeUploading}`}>
                              {item.progress}%
                            </span>
                          )}
                          {item.status === 'success' && (
                            <span className={`${styles.statusBadge} ${styles.statusBadgeSuccess}`}>
                              Uploaded
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span
                              className={`${styles.statusBadge} ${styles.statusBadgeError}`}
                              title={item.error}
                            >
                              Failed
                            </span>
                          )}

                          {!isUploading && item.status !== 'success' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(item.id)}
                              className={styles.removeBtn}
                              title="Remove file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Item progress bar */}
                      {item.status === 'uploading' && (
                        <div className={styles.itemProgressBarBg}>
                          <div
                            className={styles.itemProgressBarFill}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error message */}
                      {item.status === 'error' && item.error && (
                        <div style={{ fontSize: '0.65rem', color: '#DC2626' }}>
                          {item.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Progress */}
            {isUploading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressIndicator}>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--interactive-orange)]" />
                    Uploading batch ({totalUploaded}/{fileQueue.length} done)...
                  </span>
                  <span>{overallProgress}%</span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            {fileQueue.length > 0 && (
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleUploadAll}
                  disabled={isUploading || fileQueue.every((i) => i.status === 'success')}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Uploading Batch ({overallProgress}%)
                    </>
                  ) : (
                    <>
                      Upload {fileQueue.length} File{fileQueue.length > 1 ? 's' : ''} to /{activeDestinationFolder} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

