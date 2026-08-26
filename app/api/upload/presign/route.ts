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

    // Check if it's a batch request
    const isBatch = Array.isArray(body.items);
    const items = isBatch
      ? body.items
      : [
          {
            filename: body.filename,
            fileType: body.fileType,
            fileSize: body.fileSize,
            prefix: body.prefix,
          },
        ];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items provided for presigned URL generation' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.filename || typeof item.filename !== 'string') {
        return NextResponse.json({ error: 'Filename is required for each item' }, { status: 400 });
      }
      if (!item.fileType || typeof item.fileType !== 'string') {
        return NextResponse.json({ error: 'File type (MIME) is required for each item' }, { status: 400 });
      }
      if (item.fileSize && item.fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${item.filename}" exceeds maximum limit of 100MB` }, { status: 400 });
      }
    }

    const s3Client = getMinioClient();
    const bucket = getMinioBucket();

    // Auto-create bucket and apply policy if not existing, proceed if permissions restrict checking
    try {
      await ensureBucketExists(s3Client, bucket);
    } catch (bucketError) {
      console.warn('Bucket existence check failed. Proceeding with presign:', bucketError);
    }

    const results = await Promise.all(
      items.map(async (item: any) => {
        const itemPrefix = item.prefix || body.prefix || 'uploads';
        const objectKey = generateObjectKey(item.filename, itemPrefix);

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          ContentType: item.fileType,
          ContentDisposition: 'inline',
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        const publicUrl = getPublicUrl(objectKey);

        return {
          filename: item.filename,
          uploadUrl,
          objectKey,
          publicUrl,
          bucket,
        };
      })
    );

    if (!isBatch) {
      return NextResponse.json({
        ...results[0],
        results,
      });
    }

    return NextResponse.json({
      success: true,
      items: results,
      results,
    });
  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
