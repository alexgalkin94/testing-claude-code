import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

const USER_ID = 'alex_cutboard';
const DATA_PATH = `${USER_ID}/data.json`;

export async function GET() {
  try {
    // List blobs to find our data file
    const { blobs } = await list({ prefix: USER_ID });
    const dataBlob = blobs.find(b => b.pathname === DATA_PATH);

    if (!dataBlob) {
      return NextResponse.json(null);
    }

    // Fetch the JSON data
    const response = await fetch(dataBlob.url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blob GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    data.lastSync = new Date().toISOString();

    // Store as JSON blob
    const blob = await put(DATA_PATH, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url, lastSync: data.lastSync });
  } catch (error) {
    console.error('Blob POST error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
