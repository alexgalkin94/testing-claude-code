import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export function getDbClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error('TURSO_DATABASE_URL not set');
  }

  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return client;
}

export async function getUserData(userId: string): Promise<string | null> {
  const db = getDbClient();
  const result = await db.execute({
    sql: 'SELECT data FROM user_data WHERE user_id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].data as string;
}

export async function saveUserData(userId: string, data: string): Promise<void> {
  const db = getDbClient();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO user_data (user_id, data, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = ?, updated_at = ?`,
    args: [userId, data, now, data, now],
  });
}
