import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ProgressPhoto {
  id: string;
  date: string;
  type: 'front' | 'side' | 'back';
  imageData: string; // base64
  notes?: string;
}

interface CutBoardDB extends DBSchema {
  photos: {
    key: string;
    value: ProgressPhoto;
    indexes: { 'by-date': string; 'by-type': string };
  };
}

let dbPromise: Promise<IDBPDatabase<CutBoardDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CutBoardDB>('cutboard-photos', 1, {
      upgrade(db) {
        const store = db.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('by-date', 'date');
        store.createIndex('by-type', 'type');
      },
    });
  }
  return dbPromise;
}

export async function addPhoto(photo: Omit<ProgressPhoto, 'id'>): Promise<ProgressPhoto> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullPhoto: ProgressPhoto = { ...photo, id };
  await db.put('photos', fullPhoto);
  return fullPhoto;
}

export async function getPhotos(): Promise<ProgressPhoto[]> {
  const db = await getDB();
  const photos = await db.getAll('photos');
  return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPhotosByDate(date: string): Promise<ProgressPhoto[]> {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'by-date', date);
}

export async function getPhotosByType(type: ProgressPhoto['type']): Promise<ProgressPhoto[]> {
  const db = await getDB();
  const photos = await db.getAllFromIndex('photos', 'by-type', type);
  return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('photos', id);
}

export async function getUniqueDates(): Promise<string[]> {
  const photos = await getPhotos();
  const dates = [...new Set(photos.map(p => p.date))];
  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}
