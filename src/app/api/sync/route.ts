import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getUserData, saveUserData } from '@/lib/db';

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const data = await getUserData(userId);

    if (!data) {
      return NextResponse.json(null);
    }

    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('DB GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();
    data.lastSync = new Date().toISOString();
    data.userId = userId;

    await saveUserData(userId, JSON.stringify(data));

    return NextResponse.json({ success: true, lastSync: data.lastSync });
  } catch (error) {
    console.error('DB POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save: ${message}` }, { status: 500 });
  }
}
