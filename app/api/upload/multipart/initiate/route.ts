import { NextRequest, NextResponse } from 'next/server';
import { initiateMultipartUpload } from '@/lib/minio';
import { validateApiAuth } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Admin access required to initiate multipart uploads.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { filename, prefix = 'uploads', contentType = 'application/octet-stream' } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const result = await initiateMultipartUpload(filename, prefix, contentType);

    return NextResponse.json({
      success: true,
      uploadId: result.uploadId,
      objectKey: result.objectKey,
      publicUrl: result.publicUrl,
    });
  } catch (error: any) {
    console.error('Error initiating multipart upload:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate multipart upload' },
      { status: 500 }
    );
  }
}
