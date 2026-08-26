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

    // Support both single file ('file') and multiple files ('files' or multiple 'file' entries)
    let files: File[] = [];
    const filesEntries = formData.getAll('files') as File[];
    const fileEntries = formData.getAll('file') as File[];

    if (filesEntries.length > 0) {
      files = filesEntries.filter((f) => f && typeof f === 'object' && f.name);
    } else if (fileEntries.length > 0) {
      files = fileEntries.filter((f) => f && typeof f === 'object' && f.name);
    }

    const prefix = (formData.get('prefix') as string) || 'uploads';

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file(s) uploaded' }, { status: 400 });
    }

    // Check file sizes
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 100MB limit.` },
          { status: 400 }
        );
      }
    }

    const s3Client = getMinioClient();
    const bucket = getMinioBucket();

    // Auto-create bucket and set policy if it doesn't exist, proceed if permissions restrict checking
    try {
      await ensureBucketExists(s3Client, bucket);
    } catch (bucketError) {
      console.warn('Bucket existence check failed. Proceeding with upload:', bucketError);
    }

    const results = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const objectKey = generateObjectKey(file.name, prefix);

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

      results.push({
        publicUrl,
        objectKey,
        filename: file.name,
        fileName: file.name,
        size: file.size,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileType: file.type || 'application/octet-stream',
      });
    }

    // For single file, provide backward-compatible flat fields as well as results array
    if (results.length === 1) {
      const single = results[0];
      return NextResponse.json({
        success: true,
        ...single,
        results,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Direct upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file(s) to MinIO' },
      { status: 500 }
    );
  }
}
