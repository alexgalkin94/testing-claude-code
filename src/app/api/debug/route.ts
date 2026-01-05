import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  const checks: Record<string, any> = {
    env: {
      TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
      BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    },
    database: null,
    tables: null,
  };

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    checks.database = 'TURSO_DATABASE_URL missing';
    return NextResponse.json(checks);
  }

  try {
    const client = createClient({ url, authToken });

    // Test connection
    const result = await client.execute('SELECT 1 as test');
    checks.database = 'Connected OK';

    // Check tables
    const tables = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table'
    `);
    checks.tables = tables.rows.map((r: any) => r.name);

    // Check if user table has correct schema
    try {
      const userCount = await client.execute('SELECT COUNT(*) as count FROM user');
      checks.userCount = userCount.rows[0];
    } catch (e) {
      checks.userTableError = String(e);
    }

  } catch (error) {
    checks.database = `Error: ${String(error)}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
