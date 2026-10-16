import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth/middleware';
import { createMinioFolder, deleteMinioFolder } from '@/lib/minio';

/**
 * POST: Creates an explicit folder marker in MinIO
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

    const { folderPath } = await req.json();

    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid folderPath parameter' },
        { status: 400 }
      );
    }

    const createdPath = await createMinioFolder(folderPath);

    return NextResponse.json({
      success: true,
      folderPath: createdPath,
      message: `Folder "${createdPath}" created successfully.`,
    });
  } catch (error: any) {
    console.error('Failed to create folder in MinIO:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deletes a folder and all its contents in MinIO
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

    const { folderPath } = await req.json();

    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid folderPath parameter' },
        { status: 400 }
      );
    }

    const result = await deleteMinioFolder(folderPath);

    return NextResponse.json({
      success: true,
      folderPath,
      deletedCount: result.deletedCount,
      message: `Folder "${folderPath}" deleted successfully (${result.deletedCount} items removed).`,
    });
  } catch (error: any) {
    console.error('Failed to delete folder in MinIO:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
