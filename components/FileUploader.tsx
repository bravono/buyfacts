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

  // Upload method (default: 'multipart' for robust resumable chunked transfers)
  const [uploadMethod, setUploadMethod] = useState<'multipart' | 'server' | 'presigned'>('multipart');

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

      let lastProgressPercent = 0;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          lastProgressPercent = percent;
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
        const statusDetail = xhr.status ? ` (HTTP ${xhr.status})` : '';
        reject(
          new Error(
            `Connection was terminated by server at ${lastProgressPercent}%${statusDetail}. This occurs when an intermediate reverse proxy (e.g. Nginx client_max_body_size or Cloudflare 100MB/timeout limits) severs the stream.`
          )
        );
      };

      xhr.onabort = () => {
        delete abortControllersRef.current[item.id];
        reject(new Error('Upload cancelled.'));
      };

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
      xhr.setRequestHeader('Content-Disposition', 'inline');
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

  /**
   * Uploads a single chunk directly to MinIO using a presigned PUT URL
   */
  const uploadChunkDirect = (
    objectKey: string,
    uploadId: string,
    partNumber: number,
    chunk: Blob,
    itemId: string,
    baseUploadedBytes: number,
    totalBytes: number
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const presignRes = await fetch(
          `/api/upload/multipart/part?objectKey=${encodeURIComponent(objectKey)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`
        );
        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}));
          return reject(new Error(err.error || `Failed to get presigned URL for part ${partNumber}`));
        }
        const { presignedUrl } = await presignRes.json();

        const xhr = new XMLHttpRequest();
        abortControllersRef.current[itemId] = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const currentTotal = baseUploadedBytes + event.loaded;
            const percent = Math.min(99, Math.round((currentTotal / totalBytes) * 100));
            updateItem(itemId, { progress: percent });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const rawEtag = xhr.getResponseHeader('ETag') || '';
            const etag = rawEtag.replace(/^"+|"+$/g, '');
            if (!etag) {
              return reject(new Error('Missing ETag response header from MinIO for part upload.'));
            }
            resolve(etag);
          } else {
            reject(new Error(`Direct part upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error(`Network error uploading part ${partNumber} directly`));
        };

        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(chunk);
      } catch (err: any) {
        reject(err);
      }
    });
  };

  /**
   * Fallback: Uploads a single 5MB chunk via Next.js Server Route
   */
  const uploadChunkViaServer = (
    objectKey: string,
    uploadId: string,
    partNumber: number,
    chunk: Blob,
    itemId: string,
    baseUploadedBytes: number,
    totalBytes: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('objectKey', objectKey);
      formData.append('uploadId', uploadId);
      formData.append('partNumber', partNumber.toString());
      formData.append('chunk', chunk, `part-${partNumber}.bin`);

      const xhr = new XMLHttpRequest();
      abortControllersRef.current[itemId] = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const currentTotal = baseUploadedBytes + event.loaded;
          const percent = Math.min(99, Math.round((currentTotal / totalBytes) * 100));
          updateItem(itemId, { progress: percent });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.etag) {
              resolve(data.etag);
            } else {
              reject(new Error(data.error || 'Server route returned invalid part upload result'));
            }
          } catch {
            reject(new Error('Failed to parse server part upload response.'));
          }
        } else {
          reject(new Error(`Server part upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Network error uploading part ${partNumber} via server route`));
      };

      xhr.open('POST', '/api/upload/multipart/part', true);
      xhr.send(formData);
    });
  };

  /**
   * Uploads single file via S3 Resumable Multipart Upload (5MB Chunks)
   */
  const uploadSingleMultipart = async (item: QueueItem, folder: string): Promise<UploadSuccessResult> => {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB minimum S3 part size
    const file = item.file;
    const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const storageKey = `s3_multipart_${file.name}_${file.size}_${file.lastModified}_${folder}`;

    // Step 1: Check localStorage for existing resumable session
    let uploadId: string | null = null;
    let objectKey: string | null = null;
    let completedParts: { PartNumber: number; ETag: string }[] = [];

    const savedSessionRaw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (savedSessionRaw) {
      try {
        const saved = JSON.parse(savedSessionRaw);
        if (saved.uploadId && saved.objectKey) {
          // Verify with MinIO that this upload session is still valid
          const checkRes = await fetch(
            `/api/upload/multipart/list-parts?objectKey=${encodeURIComponent(saved.objectKey)}&uploadId=${encodeURIComponent(saved.uploadId)}`
          );
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.success && Array.isArray(checkData.parts)) {
              uploadId = saved.uploadId;
              objectKey = saved.objectKey;
              completedParts = checkData.parts.map((p: any) => ({
                PartNumber: p.partNumber,
                ETag: p.etag,
              }));
            }
          }
        }
      } catch (_) {
        // Corrupted session, ignore
      }
    }

    // If no existing session, initiate new S3 multipart upload
    if (!uploadId || !objectKey) {
      const initRes = await fetch('/api/upload/multipart/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          prefix: folder,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initiate multipart upload session.');
      }

      const initData = await initRes.json();
      uploadId = initData.uploadId;
      objectKey = initData.objectKey;
      completedParts = [];

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ uploadId, objectKey, createdAt: Date.now() })
        );
      }
    }

    // Step 2: Upload parts with retries on drops
    const completedPartNumbers = new Set(completedParts.map((p) => p.PartNumber));
    let uploadedBytes = completedParts.length * CHUNK_SIZE;

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (completedPartNumbers.has(partNumber)) {
        continue;
      }

      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);
      const chunkSize = end - start;

      let partEtag: string | null = null;
      let lastError: Error | null = null;
      const MAX_RETRIES = 5;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Attempt 1: Direct part PUT with presigned URL
          partEtag = await uploadChunkDirect(objectKey!, uploadId!, partNumber, chunkBlob, item.id, uploadedBytes, file.size);
          break;
        } catch (directErr: any) {
          console.warn(`Direct part ${partNumber} upload attempt ${attempt} failed, trying server part fallback:`, directErr);
          try {
            // Attempt fallback: Server route for chunk
            partEtag = await uploadChunkViaServer(objectKey!, uploadId!, partNumber, chunkBlob, item.id, uploadedBytes, file.size);
            break;
          } catch (serverErr: any) {
            lastError = serverErr;
            if (attempt < MAX_RETRIES) {
              // Exponential backoff wait for satellite/network drop recovery (1.5s, 3s, 4.5s...)
              await new Promise((r) => setTimeout(r, attempt * 1500));
            }
          }
        }
      }

      if (!partEtag) {
        throw new Error(
          `Failed to upload part ${partNumber} of ${totalParts} after ${MAX_RETRIES} attempts. Connection dropped: ${lastError?.message || 'Network error'}`
        );
      }

      completedParts.push({ PartNumber: partNumber, ETag: partEtag });
      completedPartNumbers.add(partNumber);
      uploadedBytes += chunkSize;

      const percent = Math.min(99, Math.round((uploadedBytes / file.size) * 100));
      updateItem(item.id, { progress: percent });
    }

    // Step 3: Complete multipart upload
    const completeRes = await fetch('/api/upload/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey,
        uploadId,
        parts: completedParts,
      }),
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete multipart upload assembly in MinIO.');
    }

    const completeData = await completeRes.json();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }

    return {
      publicUrl: completeData.publicUrl,
      objectKey: completeData.objectKey,
      fileName: file.name,
      fileType: item.mediaType,
      fileSize: file.size,
    };
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
          if (uploadMethod === 'multipart') {
            result = await uploadSingleMultipart(currentItem, destination);
          } else if (uploadMethod === 'presigned') {
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
              onClick={() => setUploadMethod('multipart')}
              className={`${styles.toggleBtn} ${uploadMethod === 'multipart' ? styles.toggleBtnActive : ''}`}
              title="Resumable S3 Multipart: Slices file into 5MB chunks with auto-retry and resume support for unstable/satellite connections (Recommended)"
            >
              <Layers className="w-3.5 h-3.5" />
              Resumable (S3 Chunks)
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
            <button
              type="button"
              onClick={() => setUploadMethod('presigned')}
              className={`${styles.toggleBtn} ${uploadMethod === 'presigned' ? styles.toggleBtnActive : ''}`}
              title="Uploads directly from browser to MinIO using single S3 presigned PUT URL"
            >
              <Zap className="w-3.5 h-3.5" />
              Direct PUT
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

