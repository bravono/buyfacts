import { NextRequest, NextResponse } from 'next/server';
import { getPresignedPartUrl, uploadPartDirect } from '@/lib/minio';
import { validateApiAuth } from '@/lib/auth/middleware';

export const maxDuration = 60; // 60 seconds timeout per chunk

/**
 * GET: Generates presigned PUT URL for a specific part
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const objectKey = searchParams.get('objectKey');
    const uploadId = searchParams.get('uploadId');
    const partNumberStr = searchParams.get('partNumber');

    if (!objectKey || !uploadId || !partNumberStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: objectKey, uploadId, partNumber' },
        { status: 400 }
      );
    }

    const partNumber = parseInt(partNumberStr, 10);
    if (isNaN(partNumber) || partNumber < 1 || partNumber > 10000) {
      return NextResponse.json(
        { error: 'partNumber must be an integer between 1 and 10000' },
        { status: 400 }
      );
    }

    const presignedUrl = await getPresignedPartUrl(objectKey, uploadId, partNumber);

    return NextResponse.json({
      success: true,
      presignedUrl,
      partNumber,
    });
  } catch (error: any) {
    console.error('Error generating part presigned URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate part presigned URL' },
      { status: 500 }
    );
  }
}

/**
 * POST: Server-side fallback for uploading a single part (5MB chunk)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Admin access required.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const objectKey = formData.get('objectKey') as string;
    const uploadId = formData.get('uploadId') as string;
    const partNumberStr = formData.get('partNumber') as string;
    const chunkFile = formData.get('chunk') as File | null;

    if (!objectKey || !uploadId || !partNumberStr || !chunkFile) {
      return NextResponse.json(
        { error: 'Missing required fields: objectKey, uploadId, partNumber, chunk' },
        { status: 400 }
      );
    }

    const partNumber = parseInt(partNumberStr, 10);
    if (isNaN(partNumber) || partNumber < 1 || partNumber > 10000) {
      return NextResponse.json(
        { error: 'partNumber must be an integer between 1 and 10000' },
        { status: 400 }
      );
    }

    const arrayBuffer = await chunkFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadPartDirect(objectKey, uploadId, partNumber, buffer);

    return NextResponse.json({
      success: true,
      partNumber: result.partNumber,
      etag: result.etag,
    });
  } catch (error: any) {
    console.error('Error uploading part via server route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}
