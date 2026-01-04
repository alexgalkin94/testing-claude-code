import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// PIN stored in environment variable - set this in Vercel
const CORRECT_PIN = process.env.CUTBOARD_PIN || '1234';
const SESSION_COOKIE = 'cutboard_session';
const SESSION_SECRET = process.env.CUTBOARD_SECRET || 'alex_cutboard_secret_2024';

// Simple hash function for session token
function createSessionToken(pin: string): string {
  const data = `${pin}_${SESSION_SECRET}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);
}

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (pin === CORRECT_PIN) {
      const sessionToken = createSessionToken(pin);

      // Set HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Falscher PIN' }, { status: 401 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);

    if (session?.value) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
