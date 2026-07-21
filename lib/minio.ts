import { S3Client } from '@aws-sdk/client-s3';

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
 * Sanitizes a filename and generates a unique object key to prevent collisions
 */
export function generateObjectKey(originalFilename: string, prefix = 'uploads'): string {
  const sanitize = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  const cleanPrefix = prefix ? `${prefix.replace(/^\/+|\/+$/g, '')}/` : '';
  return `${cleanPrefix}${timestamp}-${randomSuffix}-${sanitize}`;
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
