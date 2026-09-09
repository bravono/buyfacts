import { NextRequest, NextResponse } from 'next/server';
import { listUploadedParts } from '@/lib/minio';
import { validateApiAuth } from '@/lib/auth/middleware';

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

    if (!objectKey || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required parameters: objectKey and uploadId' },
        { status: 400 }
      );
    }

    const parts = await listUploadedParts(objectKey, uploadId);

    return NextResponse.json({
      success: true,
      parts,
    });
  } catch (error: any) {
    console.error('Error listing uploaded parts:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list uploaded parts' },
      { status: 500 }
    );
  }
}
