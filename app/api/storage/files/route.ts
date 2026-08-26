import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth/middleware';
import {
  listMinioObjects,
  deleteMinioObject,
  STORAGE_FOLDERS,
  getPublicUrl,
} from '@/lib/minio';
import { prisma } from '@/lib/prisma';

/**
 * GET: Lists all files in MinIO storage, optionally filtered by folder prefix
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
    const folder = searchParams.get('folder') || 'all';

    const files = await listMinioObjects(folder);

    return NextResponse.json({
      success: true,
      files,
      folders: STORAGE_FOLDERS,
      totalCount: files.length,
    });
  } catch (error: any) {
    console.error('Failed to list storage files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list storage objects' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deletes an object from MinIO and deletes matching database records
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

    const { objectKey } = await req.json();

    if (!objectKey || typeof objectKey !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid objectKey parameter' },
        { status: 400 }
      );
    }

    // Delete from MinIO
    await deleteMinioObject(objectKey);

    const publicUrl = getPublicUrl(objectKey);

    // Clean up corresponding database record
    try {
      await prisma.mediaAsset.deleteMany({
        where: {
          publicUrl: {
            contains: objectKey,
          },
        },
      });
    } catch (dbErr) {
      console.warn('Could not delete corresponding DB asset record:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Object ${objectKey} deleted successfully.`,
      objectKey,
    });
  } catch (error: any) {
    console.error('Failed to delete storage object:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete storage object' },
      { status: 500 }
    );
  }
}
