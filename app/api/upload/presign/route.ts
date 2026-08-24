import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getMinioClient, getMinioBucket, generateObjectKey, getPublicUrl, ensureBucketExists } from '@/lib/minio';
import { validateApiAuth } from '@/lib/auth/middleware';

// Maximum allowed file size (100MB in bytes)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Admin access required to generate upload URLs.' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { filename, fileType, fileSize, prefix } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    if (!fileType || typeof fileType !== 'string') {
      return NextResponse.json({ error: 'File type (MIME) is required' }, { status: 400 });
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 100MB' }, { status: 400 });
    }

    const s3Client = getMinioClient();
    const bucket = getMinioBucket();
    const objectKey = generateObjectKey(filename, prefix || 'uploads');

    // Auto-create bucket and apply policy if not existing, proceed if permissions restrict checking
    try {
      await ensureBucketExists(s3Client, bucket);
    } catch (bucketError) {
      console.warn('Bucket existence check failed (likely due to HeadBucket/CORS restriction). Proceeding with presign:', bucketError);
    }

    // Create PutObject command with explicit ContentType and ContentDisposition
    // ContentDisposition: 'inline' ensures browser displays/plays the file rather than downloading
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: fileType,
      ContentDisposition: 'inline',
    });

    // Generate signed URL valid for 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const publicUrl = getPublicUrl(objectKey);

    return NextResponse.json({
      uploadUrl,
      objectKey,
      publicUrl,
      bucket,
    });
  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
