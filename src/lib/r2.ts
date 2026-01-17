import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (client) return client;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'cutboard-photos';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export interface PhotoInfo {
  url: string;
  key: string;
  date: string;
  uploadedAt: string;
}

export async function listPhotos(userId: string): Promise<PhotoInfo[]> {
  const r2 = getR2Client();
  const prefix = `users/${userId}/photos/`;

  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: prefix,
  });

  const response = await r2.send(command);
  const photos: PhotoInfo[] = [];

  for (const obj of response.Contents || []) {
    if (!obj.Key) continue;
    const filename = obj.Key.split('/').pop() || '';
    const datePart = filename.split('_')[0];

    photos.push({
      url: `${R2_PUBLIC_URL}/${obj.Key}`,
      key: obj.Key,
      date: datePart,
      uploadedAt: obj.LastModified?.toISOString() || '',
    });
  }

  return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function uploadPhoto(
  userId: string,
  file: Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const r2 = getR2Client();
  const key = `users/${userId}/photos/${filename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await r2.send(command);

  return {
    url: `${R2_PUBLIC_URL}/${key}`,
    key,
  };
}

export async function deletePhoto(key: string): Promise<void> {
  const r2 = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  await r2.send(command);
}
