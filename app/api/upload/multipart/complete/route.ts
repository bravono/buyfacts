import { NextRequest, NextResponse } from 'next/server';
import { completeMultipartUpload, abortMultipartUpload } from '@/lib/minio';
import { validateApiAuth } from '@/lib/auth/middleware';

/**
 * POST: Completes an S3 multipart upload session
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

    const body = await req.json().catch(() => ({}));
    const { objectKey, uploadId, parts } = body;

    if (!objectKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: objectKey, uploadId, and non-empty parts array' },
        { status: 400 }
      );
    }

    const formattedParts = parts.map((p: any) => ({
      PartNumber: typeof p.partNumber === 'number' ? p.partNumber : p.PartNumber,
      ETag: p.etag || p.ETag,
    }));

    const result = await completeMultipartUpload(objectKey, uploadId, formattedParts);

    return NextResponse.json({
      success: true,
      objectKey: result.objectKey,
      publicUrl: result.publicUrl,
    });
  } catch (error: any) {
    console.error('Error completing multipart upload:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete multipart upload' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Aborts an in-progress S3 multipart upload session and frees resources
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Admin access required.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { objectKey, uploadId } = body;

    if (!objectKey || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required parameters: objectKey and uploadId' },
        { status: 400 }
      );
    }

    await abortMultipartUpload(objectKey, uploadId);

    return NextResponse.json({
      success: true,
      message: 'Multipart upload aborted successfully',
    });
  } catch (error: any) {
    console.error('Error aborting multipart upload:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to abort multipart upload' },
      { status: 500 }
    );
  }
}
