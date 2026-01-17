import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { saveUserData, getUserData } from '@/lib/db';

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
  const dataPath = `users/${userId}/data.json`;

  try {
    // Check if user already has data in database
    const existingData = await getUserData(userId);
    if (existingData) {
      return NextResponse.json({
        success: true,
        message: 'Data already exists in database, skipping migration',
        source: 'database'
      });
    }

    // Try to fetch from Vercel Blob
    const { blobs } = await list({ prefix: `users/${userId}` });
    const dataBlob = blobs.find(b => b.pathname === dataPath);

    if (!dataBlob) {
      return NextResponse.json({
        success: true,
        message: 'No data found in Blob storage to migrate',
        source: 'none'
      });
    }

    // Fetch the data from Blob
    const response = await fetch(dataBlob.url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data from Blob' }, { status: 500 });
    }

    const data = await response.json();

    // Save to database
    await saveUserData(userId, JSON.stringify(data));

    return NextResponse.json({
      success: true,
      message: 'Data migrated from Blob to database successfully',
      source: 'blob',
      lastSync: data.lastSync
    });
  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Migration failed: ${message}` }, { status: 500 });
  }
}
