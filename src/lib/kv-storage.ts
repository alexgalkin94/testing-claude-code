// Vercel KV Storage for permanent data persistence
// Falls back to localStorage in development

import { kv } from '@vercel/kv';

// Unique user ID - in production you'd use auth
const USER_ID = 'alex_cutboard_2024';

export interface WeightEntry {
  date: string;
  weight: number;
  note?: string;
}

export interface ChecklistEntry {
  date: string;
  dayType: 'A' | 'B';
  checkedItems: string[];
  completedAt?: string;
}

export interface WorkoutEntry {
  date: string;
  type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'rest';
  exercises?: string[];
  duration?: number;
  feeling?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export interface DailyNote {
  date: string;
  energy: 1 | 2 | 3 | 4 | 5;
  hunger: 1 | 2 | 3 | 4 | 5;
  sleep?: number;
  note?: string;
}

export interface UserProfile {
  name: string;
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  startDate: string;
  targetDate?: string;
  calorieTarget: number;
  proteinTarget: number;
  tdee: number;
}

export interface CutboardData {
  profile: UserProfile;
  weights: WeightEntry[];
  checklists: ChecklistEntry[];
  workouts: WorkoutEntry[];
  notes: DailyNote[];
  lastSync: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex',
  startWeight: 90,
  currentWeight: 90,
  goalWeight: 82,
  startDate: '2024-12-01',
  calorieTarget: 1700,
  proteinTarget: 157,
  tdee: 2125,
};

const STORAGE_KEY = `cutboard:${USER_ID}`;
const LOCAL_CACHE_KEY = 'cutboard_cache';

// Check if we're in a server environment with KV access
async function hasKVAccess(): Promise<boolean> {
  if (typeof window !== 'undefined') return false;
  try {
    await kv.ping();
    return true;
  } catch {
    return false;
  }
}

// Get data from KV or localStorage fallback
export async function getData(): Promise<CutboardData> {
  // Client-side: use localStorage cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return getDefaultData();
  }

  // Server-side: try KV first
  try {
    const data = await kv.get<CutboardData>(STORAGE_KEY);
    if (data) return data;
  } catch (e) {
    console.error('KV read error:', e);
  }

  return getDefaultData();
}

// Save data to KV and update local cache
export async function saveData(data: CutboardData): Promise<void> {
  data.lastSync = new Date().toISOString();

  // Update local cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  }

  // Save to KV if available
  try {
    if (await hasKVAccess()) {
      await kv.set(STORAGE_KEY, data);
    }
  } catch (e) {
    console.error('KV write error:', e);
  }
}

function getDefaultData(): CutboardData {
  return {
    profile: DEFAULT_PROFILE,
    weights: [],
    checklists: [],
    workouts: [],
    notes: [],
    lastSync: new Date().toISOString(),
  };
}

// Helper functions for specific data types
export async function addWeightEntry(entry: WeightEntry): Promise<void> {
  const data = await getData();
  const existingIndex = data.weights.findIndex(w => w.date === entry.date);

  if (existingIndex >= 0) {
    data.weights[existingIndex] = entry;
  } else {
    data.weights.push(entry);
  }

  data.weights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Update current weight in profile
  if (data.weights.length > 0) {
    data.profile.currentWeight = data.weights[data.weights.length - 1].weight;
  }

  await saveData(data);
}

export async function saveChecklist(entry: ChecklistEntry): Promise<void> {
  const data = await getData();
  const existingIndex = data.checklists.findIndex(c => c.date === entry.date);

  if (existingIndex >= 0) {
    data.checklists[existingIndex] = entry;
  } else {
    data.checklists.push(entry);
  }

  await saveData(data);
}

export async function addWorkout(entry: WorkoutEntry): Promise<void> {
  const data = await getData();
  const existingIndex = data.workouts.findIndex(w => w.date === entry.date);

  if (existingIndex >= 0) {
    data.workouts[existingIndex] = entry;
  } else {
    data.workouts.push(entry);
  }

  await saveData(data);
}

export async function addDailyNote(entry: DailyNote): Promise<void> {
  const data = await getData();
  const existingIndex = data.notes.findIndex(n => n.date === entry.date);

  if (existingIndex >= 0) {
    data.notes[existingIndex] = entry;
  } else {
    data.notes.push(entry);
  }

  await saveData(data);
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<void> {
  const data = await getData();
  data.profile = { ...data.profile, ...profile };
  await saveData(data);
}
