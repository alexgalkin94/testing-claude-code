import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const USER_ID = 'alex_cutboard_2024';
const STORAGE_KEY = `cutboard:${USER_ID}`;

export async function GET() {
  try {
    const data = await kv.get(STORAGE_KEY);
    return NextResponse.json(data || null);
  } catch (error) {
    console.error('KV GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    data.lastSync = new Date().toISOString();
    await kv.set(STORAGE_KEY, data);
    return NextResponse.json({ success: true, lastSync: data.lastSync });
  } catch (error) {
    console.error('KV POST error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
