import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

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
 * Verifies if the target bucket exists, and creates it with public read policy if not.
 */
export async function ensureBucketExists(s3Client: S3Client, bucketName: string) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
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
    .filter((item) => item.Key && !item.Key.endsWith('/'))
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
