import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  CompletedPart,
  PutObjectCommand,
  ListObjectsV2CommandOutput,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * MinIO Configuration from Environment Variables
 */
export const MINIO_CONFIG = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  bucket: process.env.MINIO_BUCKET || 'uploads',
  publicUrlPrefix: process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
};

/**
 * System Storage Folders
 */
export const STORAGE_FOLDERS = [
  { value: 'products-services', label: 'Products & Services' },
  { value: 'research-imperatives', label: 'Research Imperatives' },
  { value: 'cubicon', label: 'Cubicon' },
  { value: 'research-lib', label: 'Research Lib' },
  { value: 'triad', label: 'Triad' },
  { value: 'rule-of-three', label: 'Rule of Three' },
  { value: 'uploads', label: 'Uploads' },
] as const;

// Singleton S3Client instance for MinIO
let s3ClientInstance: S3Client | null = null;

/**
 * Returns a configured S3Client instance compatible with MinIO
 */
export function getMinioClient(): S3Client {
  if (!s3ClientInstance) {
    const endpoint = process.env.MINIO_ENDPOINT || MINIO_CONFIG.endpoint;
    const accessKeyId = process.env.MINIO_ACCESS_KEY || MINIO_CONFIG.accessKey;
    const secretAccessKey = process.env.MINIO_SECRET_KEY || MINIO_CONFIG.secretKey;
    const region = process.env.MINIO_REGION || MINIO_CONFIG.region;

    s3ClientInstance = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Essential for MinIO and non-AWS S3 providers: path-style URLs e.g. http://endpoint/bucket/key
      forcePathStyle: true,
    });
  }

  return s3ClientInstance;
}

/**
 * Returns the configured MinIO bucket name
 */
export function getMinioBucket(): string {
  return process.env.MINIO_BUCKET || MINIO_CONFIG.bucket;
}

/**
 * Applies a permissive CORS policy to the MinIO bucket to allow direct browser PUT uploads.
 */
/**
 * Origins the browser is allowed to read bucket objects from.
 *
 * This list used to be hard-coded to ['*'] while the bucket actually ran an explicit list
 * (localhost + production). That mismatch is why documents rendered locally but failed on
 * staging. Every origin that runs the app must appear here.
 *
 * Override/extend with MINIO_ALLOWED_ORIGINS (comma separated), e.g.
 *   MINIO_ALLOWED_ORIGINS=https://staging.buyfacts.com,https://buyfacts.com
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://buyfacts.com',
  'https://www.buyfacts.com',
];

export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.MINIO_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]));
}

export async function applyBucketCorsPolicy(s3Client: S3Client, bucketName: string) {
  try {
    const allowedOrigins = getAllowedOrigins();

    await s3Client.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
              AllowedOrigins: allowedOrigins,
              ExposeHeaders: ['ETag', 'Content-Type', 'Content-Length'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.log(
      `Bucket "${bucketName}" CORS policy applied for origins: ${allowedOrigins.join(', ')}`
    );
  } catch (corsErr: any) {
    const code = corsErr?.name || "";
    if (code === "NotImplemented") {
      console.warn(
        `Bucket "${bucketName}" storage does not implement a CORS policy (or the credentials ` +
          `may not set one). Documents are still readable: the app fetches them through its own ` +
          `same-origin /api/document-proxy route, so bucket CORS is not required.`
      );
      return;
    }
    console.warn(`Warning applying CORS policy to bucket "${bucketName}":`, corsErr?.message || corsErr);
  }
}

/**
 * Reads the bucket's current CORS rules so a misconfiguration can be diagnosed instead of
 * guessed at. Returns null when the policy cannot be read.
 */
export async function getBucketCorsPolicy(
  s3Client: S3Client,
  bucketName: string
): Promise<Array<{ origins: string[]; methods: string[] }> | null> {
  try {
    const res = await s3Client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    return (res.CORSRules || []).map((rule) => ({
      origins: rule.AllowedOrigins || [],
      methods: rule.AllowedMethods || [],
    }));
  } catch (err: any) {
    if (err?.name === "NoSuchCORSConfiguration" || err?.name === "NotImplemented") {
      // No policy set — which is fine: documents are read through the same-origin proxy.
      return [];
    }
    return null;
  }
}

/**
 * Verifies if the target bucket exists, and creates it with public read policy and CORS if not.
 */
export async function ensureBucketExists(s3Client: S3Client, bucketName: string) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    // Ensure CORS policy is up to date for existing buckets
    await applyBucketCorsPolicy(s3Client, bucketName);
  } catch (error: any) {
    // If bucket doesn't exist, create it
    if (error.name === 'NoSuchBucket' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        console.log(`Bucket "${bucketName}" not found. Creating it...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        
        // Define public read policy so files can be rendered directly by URLs
        const publicReadPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicRead',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
          ],
        };

        await s3Client.send(
          new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(publicReadPolicy),
          })
        );
        console.log(`Bucket "${bucketName}" created and public read policy applied successfully.`);

        // Apply CORS policy to the new bucket
        await applyBucketCorsPolicy(s3Client, bucketName);
      } catch (createErr: any) {
        console.error(`Error auto-creating bucket:`, createErr);
        throw new Error(`Bucket "${bucketName}" does not exist, and automatic creation failed: ${createErr.message}`);
      }
    } else {
      throw error;
    }
  }
}

/**
 * Sanitizes and normalizes a folder prefix path (e.g. "media/subfolder", "cubicon/models")
 * Prevents path traversal and removes illegal characters.
 */
export function sanitizeFolderPrefix(prefix?: string): string {
  if (!prefix || typeof prefix !== 'string' || !prefix.trim()) {
    return 'uploads';
  }

  const normalized = prefix
    .replace(/\\/g, '/')
    .replace(/\.{2,}/g, '') // remove parent directory traversal
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim();

  if (!normalized) {
    return 'uploads';
  }

  // Sanitize individual directory segments
  const segments = normalized.split('/').map((seg) =>
    seg.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/^_+|_+$/g, '')
  ).filter(Boolean);

  return segments.length > 0 ? segments.join('/') : 'uploads';
}

/**
 * Extracts folder prefix from an object key
 */
export function extractFolderFromKey(objectKey: string): string {
  const parts = objectKey.split('/');
  if (parts.length > 1) {
    return parts.slice(0, -1).join('/');
  }
  return 'uploads';
}

/**
 * Extracts filename component from an object key
 */
export function extractFilenameFromKey(objectKey: string): string {
  const raw = objectKey.split('/').pop() || objectKey;
  // If key follows timestamp-random-filename pattern, extract friendly name
  const match = raw.match(/^\d+-[a-z0-9]+-(.+)$/);
  return match ? match[1] : raw;
}

/**
 * Sanitizes a filename and generates a unique object key to prevent collisions
 */
export function generateObjectKey(originalFilename: string, prefix = 'uploads'): string {
  const sanitize = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  const cleanPrefix = sanitizeFolderPrefix(prefix);
  return `${cleanPrefix}/${timestamp}-${randomSuffix}-${sanitize}`;
}

/**
 * Returns the public direct URL for an object stored in MinIO.
 * This URL can be directly embedded in <img>, <video>, <audio>, <iframe>, or saved to a database.
 */
export function getPublicUrl(objectKey: string): string {
  const publicEndpoint = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || MINIO_CONFIG.endpoint;
  const cleanEndpoint = publicEndpoint.replace(/\/+$/, '');
  const bucket = getMinioBucket();

  return `${cleanEndpoint}/${bucket}/${objectKey}`;
}

export interface MinioObjectItem {
  objectKey: string;
  publicUrl: string;
  fileName: string;
  folder: string;
  size: number;
  lastModified: string;
}

export interface MinioFolderItem {
  name: string;
  path: string;
  itemCount: number;
}

export interface MinioBreadcrumbItem {
  name: string;
  path: string;
}

export interface MinioListingResult {
  currentFolder: string;
  breadcrumbs: MinioBreadcrumbItem[];
  folders: MinioFolderItem[];
  files: MinioObjectItem[];
  allFolders: string[];
  totalCount: number;
}

/**
 * Lists objects from MinIO bucket
 */
export async function listMinioObjects(prefix?: string): Promise<MinioObjectItem[]> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  try {
    await ensureBucketExists(s3Client, bucket);
  } catch (err) {
    console.warn('Bucket existence check failed during listing:', err);
  }

  const cleanPrefix = prefix && prefix !== 'all' ? sanitizeFolderPrefix(prefix) : '';
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: cleanPrefix ? `${cleanPrefix}/` : undefined,
  });

  const response = await s3Client.send(command);
  const contents = response.Contents || [];

  return contents
    .filter(
      (item) =>
        item.Key &&
        !item.Key.endsWith('/') &&
        !item.Key.endsWith('/.keep') &&
        item.Key !== '.keep'
    )
    .map((item) => {
      const objectKey = item.Key!;
      return {
        objectKey,
        publicUrl: getPublicUrl(objectKey),
        fileName: extractFilenameFromKey(objectKey),
        folder: extractFolderFromKey(objectKey),
        size: item.Size || 0,
        lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
      };
    })
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

/**
 * Lists a hierarchical tree of folders and files from MinIO,
 * discovering all nested directories and subfolders dynamically.
 */
export async function listMinioTree(
  prefix = '',
  viewMode: 'hierarchical' | 'flat' = 'hierarchical'
): Promise<MinioListingResult> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  try {
    await ensureBucketExists(s3Client, bucket);
  } catch (err) {
    console.warn('Bucket existence check failed during tree listing:', err);
  }

  // Fetch all objects in bucket to build dynamic directory tree
  let allContents: Array<{ Key?: string; Size?: number; LastModified?: Date }> = [];
  let continuationToken: string | undefined = undefined;

  do {
    const listCmd: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });
    const listRes: ListObjectsV2CommandOutput = await s3Client.send(listCmd);
    if (listRes.Contents) {
      allContents = allContents.concat(listRes.Contents);
    }
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  // Discover all unique folder paths across the entire bucket
  const discoveredFolderSet = new Set<string>();

  // Add system preset folders
  for (const preset of STORAGE_FOLDERS) {
    discoveredFolderSet.add(preset.value);
  }

  // Discover all parent directories from object keys
  for (const item of allContents) {
    if (!item.Key) continue;
    const parts = item.Key.split('/').filter(Boolean);
    if (parts.length > 1) {
      const isMarker = item.Key.endsWith('/.keep') || item.Key.endsWith('/');
      const folderParts = isMarker ? parts.slice(0, item.Key.endsWith('/.keep') ? -1 : parts.length) : parts.slice(0, -1);
      
      let cumulative = '';
      for (const part of folderParts) {
        cumulative = cumulative ? `${cumulative}/${part}` : part;
        discoveredFolderSet.add(cumulative);
      }
    }
  }

  const allFolders = Array.from(discoveredFolderSet).sort((a, b) => a.localeCompare(b));

  // Determine normalized current prefix
  const isRoot = !prefix || prefix === 'all' || prefix === 'root';
  const cleanPrefix = isRoot ? '' : sanitizeFolderPrefix(prefix);

  // Generate breadcrumbs trail
  const breadcrumbs: MinioBreadcrumbItem[] = [{ name: 'Root', path: '' }];
  if (cleanPrefix) {
    const parts = cleanPrefix.split('/').filter(Boolean);
    let cumulative = '';
    for (const part of parts) {
      cumulative = cumulative ? `${cumulative}/${part}` : part;
      breadcrumbs.push({ name: part, path: cumulative });
    }
  }

  // Valid files (excluding directory markers)
  const validFiles = allContents.filter(
    (item) =>
      item.Key &&
      !item.Key.endsWith('/') &&
      !item.Key.endsWith('/.keep') &&
      item.Key !== '.keep'
  );

  let directFiles: MinioObjectItem[] = [];
  let directFolders: MinioFolderItem[] = [];

  if (viewMode === 'flat') {
    // Flat view: return all files matching the prefix recursively
    directFiles = validFiles
      .filter((item) => {
        if (!cleanPrefix) return true;
        return item.Key!.startsWith(`${cleanPrefix}/`);
      })
      .map((item) => {
        const objectKey = item.Key!;
        return {
          objectKey,
          publicUrl: getPublicUrl(objectKey),
          fileName: extractFilenameFromKey(objectKey),
          folder: extractFolderFromKey(objectKey),
          size: item.Size || 0,
          lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } else {
    // Hierarchical view:
    // 1. Files located directly in current folder
    directFiles = validFiles
      .filter((item) => {
        const folder = extractFolderFromKey(item.Key!);
        if (!cleanPrefix) {
          // In root: show files without folder or whose folder is 'uploads' without nesting
          return !item.Key!.includes('/') || folder === 'uploads';
        }
        return folder === cleanPrefix;
      })
      .map((item) => {
        const objectKey = item.Key!;
        return {
          objectKey,
          publicUrl: getPublicUrl(objectKey),
          fileName: extractFilenameFromKey(objectKey),
          folder: extractFolderFromKey(objectKey),
          size: item.Size || 0,
          lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    // 2. Immediate subfolders under current folder
    const subfolderMap = new Map<string, { path: string; count: number }>();

    for (const folderPath of allFolders) {
      if (!cleanPrefix) {
        // Direct top-level folders
        if (!folderPath.includes('/')) {
          subfolderMap.set(folderPath, { path: folderPath, count: 0 });
        }
      } else {
        // Direct subfolders under cleanPrefix
        if (folderPath.startsWith(`${cleanPrefix}/`)) {
          const remaining = folderPath.slice(cleanPrefix.length + 1);
          const firstSegment = remaining.split('/')[0];
          const directSubPath = `${cleanPrefix}/${firstSegment}`;
          if (!subfolderMap.has(directSubPath)) {
            subfolderMap.set(directSubPath, { path: directSubPath, count: 0 });
          }
        }
      }
    }

    // Calculate item counts for each subfolder
    for (const [subPath, val] of subfolderMap.entries()) {
      const count = validFiles.filter((item) => item.Key!.startsWith(`${subPath}/`)).length;
      val.count = count;
    }

    directFolders = Array.from(subfolderMap.entries())
      .map(([subPath, data]) => ({
        name: subPath.split('/').pop() || subPath,
        path: subPath,
        itemCount: data.count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    currentFolder: cleanPrefix,
    breadcrumbs,
    folders: directFolders,
    files: directFiles,
    allFolders,
    totalCount: directFiles.length,
  };
}

/**
 * Creates an explicit folder marker in MinIO
 */
export async function createMinioFolder(folderPath: string): Promise<string> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();
  await ensureBucketExists(s3Client, bucket);

  const cleanPath = sanitizeFolderPrefix(folderPath);
  const markerKey = `${cleanPath}/.keep`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: markerKey,
      Body: '',
      ContentType: 'application/x-directory',
    })
  );

  return cleanPath;
}

/**
 * Deletes an entire folder and all its contents in MinIO
 */
export async function deleteMinioFolder(folderPath: string): Promise<{ deletedCount: number }> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();
  const cleanPath = sanitizeFolderPrefix(folderPath);

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `${cleanPath}/`,
  });

  const response = await s3Client.send(command);
  const contents = response.Contents || [];

  for (const item of contents) {
    if (item.Key) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: item.Key,
        })
      );
    }
  }

  return { deletedCount: contents.length };
}

/**
 * Moves an object from its current location to a new destination folder in MinIO
 */
export async function moveMinioObject(
  sourceKey: string,
  targetFolder: string
): Promise<{ newObjectKey: string; newPublicUrl: string }> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  const cleanTargetFolder = sanitizeFolderPrefix(targetFolder);
  const rawFilename = sourceKey.split('/').pop() || sourceKey;
  const newObjectKey = `${cleanTargetFolder}/${rawFilename}`;

  if (sourceKey === newObjectKey) {
    return {
      newObjectKey,
      newPublicUrl: getPublicUrl(newObjectKey),
    };
  }

  // Copy object to new key
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
      Key: newObjectKey,
    })
  );

  // Delete old object
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: sourceKey,
    })
  );

  return {
    newObjectKey,
    newPublicUrl: getPublicUrl(newObjectKey),
  };
}

/**
 * Deletes an object from MinIO
 */
export async function deleteMinioObject(objectKey: string): Promise<void> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    })
  );
}

/**
 * Initiates an S3 Multipart Upload session
 */
export async function initiateMultipartUpload(
  filename: string,
  prefix = 'uploads',
  contentType = 'application/octet-stream'
): Promise<{ uploadId: string; objectKey: string; publicUrl: string }> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();
  await ensureBucketExists(s3Client, bucket);

  const objectKey = generateObjectKey(filename, prefix);

  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
    ContentDisposition: 'inline',
  });

  const response = await s3Client.send(command);
  if (!response.UploadId) {
    throw new Error('Failed to initiate multipart upload: Missing UploadId in S3 response');
  }

  return {
    uploadId: response.UploadId,
    objectKey,
    publicUrl: getPublicUrl(objectKey),
  };
}

/**
 * Generates a presigned PUT URL for a specific part in a multipart upload
 */
export async function getPresignedPartUrl(
  objectKey: string,
  uploadId: string,
  partNumber: number,
  expiresIn = 900
): Promise<string> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: objectKey,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Directly uploads a single part buffer on the server
 */
export async function uploadPartDirect(
  objectKey: string,
  uploadId: string,
  partNumber: number,
  body: Buffer | Uint8Array
): Promise<{ partNumber: number; etag: string }> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: objectKey,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
  });

  const response = await s3Client.send(command);
  const rawEtag = response.ETag || '';
  const cleanEtag = rawEtag.replace(/^"+|"+$/g, '');

  return {
    partNumber,
    etag: cleanEtag,
  };
}

/**
 * Completes a multipart upload by assembling all parts
 */
export async function completeMultipartUpload(
  objectKey: string,
  uploadId: string,
  parts: CompletedPart[]
): Promise<{ objectKey: string; publicUrl: string }> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  // Parts must be sorted ascending by PartNumber per S3 spec
  const sortedParts = [...parts].sort((a, b) => (a.PartNumber || 0) - (b.PartNumber || 0));

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: objectKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts.map((p) => ({
        PartNumber: p.PartNumber,
        ETag: p.ETag ? (p.ETag.startsWith('"') ? p.ETag : `"${p.ETag}"`) : undefined,
      })),
    },
  });

  await s3Client.send(command);

  return {
    objectKey,
    publicUrl: getPublicUrl(objectKey),
  };
}

/**
 * Aborts an in-progress multipart upload and discards uploaded parts
 */
export async function abortMultipartUpload(objectKey: string, uploadId: string): Promise<void> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  const command = new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: objectKey,
    UploadId: uploadId,
  });

  await s3Client.send(command);
}

/**
 * Lists already uploaded parts for an in-progress multipart upload (useful for resumption)
 */
export async function listUploadedParts(
  objectKey: string,
  uploadId: string
): Promise<{ partNumber: number; etag: string; size: number }[]> {
  const s3Client = getMinioClient();
  const bucket = getMinioBucket();

  const command = new ListPartsCommand({
    Bucket: bucket,
    Key: objectKey,
    UploadId: uploadId,
  });

  try {
    const response = await s3Client.send(command);
    if (!response.Parts) return [];

    return response.Parts.map((p) => ({
      partNumber: p.PartNumber || 0,
      etag: (p.ETag || '').replace(/^"+|"+$/g, ''),
      size: p.Size || 0,
    }));
  } catch (err: any) {
    if (err.name === 'NoSuchUpload' || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw err;
  }
}

