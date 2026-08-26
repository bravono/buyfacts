import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth/middleware';
import { moveMinioObject, getPublicUrl } from '@/lib/minio';
import { prisma } from '@/lib/prisma';

/**
 * POST: Moves an object from one destination folder to another in MinIO
 * and updates associated database records (MediaAsset, DashboardButton).
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

    const { sourceKey, targetFolder } = await req.json();

    if (!sourceKey || typeof sourceKey !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid sourceKey parameter' },
        { status: 400 }
      );
    }

    if (!targetFolder || typeof targetFolder !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid targetFolder parameter' },
        { status: 400 }
      );
    }

    const oldPublicUrl = getPublicUrl(sourceKey);

    // Perform copy and delete in MinIO
    const { newObjectKey, newPublicUrl } = await moveMinioObject(sourceKey, targetFolder);

    // Update MediaAsset table if record exists with old URL
    try {
      await prisma.mediaAsset.updateMany({
        where: {
          publicUrl: oldPublicUrl,
        },
        data: {
          publicUrl: newPublicUrl,
        },
      });
    } catch (dbErr) {
      console.warn('Could not update MediaAsset records during move:', dbErr);
    }

    // Update DashboardButton table if any buttons are linked to old URL
    try {
      await prisma.dashboardButton.updateMany({
        where: {
          mediaUrl: oldPublicUrl,
        },
        data: {
          mediaUrl: newPublicUrl,
        },
      });
    } catch (dbErr) {
      console.warn('Could not update DashboardButton records during move:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Object moved to ${targetFolder} successfully.`,
      sourceKey,
      newObjectKey,
      oldPublicUrl,
      newPublicUrl,
      targetFolder,
    });
  } catch (error: any) {
    console.error('Failed to move storage object:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to move storage object' },
      { status: 500 }
    );
  }
}
