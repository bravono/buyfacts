import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getMinioClient, getMinioBucket, generateObjectKey, getPublicUrl, ensureBucketExists } from '@/lib/minio';
import { validateApiAuth } from '@/lib/auth/middleware';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const maxDuration = 60; // 60 seconds timeout for large uploads

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Admin access required to upload assets.' },
        { status: 401 }
      );
    }
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseError: any) {
      console.error('FormData parsing error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse upload request body. The file might be truncated or exceed server limits.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const prefix = (formData.get('prefix') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 100MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const s3Client = getMinioClient();
    const bucket = getMinioBucket();
    const objectKey = generateObjectKey(file.name, prefix);

    // Auto-create bucket and set policy if it doesn't exist, proceed if permissions restrict checking
    try {
      await ensureBucketExists(s3Client, bucket);
    } catch (bucketError) {
      console.warn('Bucket existence check failed (likely due to HeadBucket/CORS restriction). Proceeding with upload:', bucketError);
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
        ContentDisposition: 'inline',
      })
    );

    const publicUrl = getPublicUrl(objectKey);

    return NextResponse.json({
      success: true,
      publicUrl,
      objectKey,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error('Direct upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file to MinIO' },
      { status: 500 }
    );
  }
}
