import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { uploadPhoto } from '@/lib/r2';

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function POST() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const photosPrefix = `users/${userId}/photos/`;

  try {
    // List all photos from Vercel Blob
    const { blobs } = await list({ prefix: photosPrefix });

    if (blobs.length === 0) {
      return NextResponse.json({ message: 'No photos to migrate', migrated: 0 });
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const blob of blobs) {
      try {
        // Download from Vercel Blob
        const response = await fetch(blob.url);
        if (!response.ok) {
          errors.push(`Failed to download ${blob.pathname}: ${response.status}`);
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Extract just the filename from the pathname
        const filename = blob.pathname.split('/').pop() || '';

        // Upload to R2
        await uploadPhoto(userId, buffer, filename, contentType);
        migrated++;
      } catch (err) {
        errors.push(`Error migrating ${blob.pathname}: ${err}`);
      }
    }

    return NextResponse.json({
      message: `Migration complete`,
      total: blobs.length,
      migrated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
