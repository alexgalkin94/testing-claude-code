'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WeightEntry {
  date: string;
  weight: number;
  note?: string;
}

export interface ChecklistEntry {
  date: string;
  dayType: 'A' | 'B';
  checkedItems: string[];
}

export interface WorkoutEntry {
  date: string;
  type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'rest';
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

const LOCAL_STORAGE_KEY = 'cutboard_data';

const DEFAULT_DATA: CutboardData = {
  profile: {
    name: 'Alex',
    startWeight: 90,
    currentWeight: 90,
    goalWeight: 82,
    startDate: '2024-12-01',
    calorieTarget: 1700,
    proteinTarget: 157,
    tdee: 2125,
  },
  weights: [],
  checklists: [],
  workouts: [],
  notes: [],
  lastSync: new Date().toISOString(),
};

export function useCutboard() {
  const [data, setData] = useState<CutboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // First load from localStorage for instant UI
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      setData(JSON.parse(cached));
    }

    // Then try to sync from server
    try {
      const response = await fetch('/api/sync');
      if (response.ok) {
        const serverData = await response.json();
        if (serverData && serverData.lastSync) {
          // Use server data if newer
          const localData = cached ? JSON.parse(cached) : null;
          if (!localData || new Date(serverData.lastSync) > new Date(localData.lastSync)) {
            setData(serverData);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverData));
          }
        }
      }
    } catch (e) {
      console.log('Server sync unavailable, using local data');
    }

    setLoading(false);
  };

  const saveData = useCallback(async (newData: CutboardData) => {
    newData.lastSync = new Date().toISOString();
    setData(newData);

    // Save locally immediately
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));

    // Sync to server in background
    setSyncing(true);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
    } catch (e) {
      console.log('Server sync failed, data saved locally');
    }
    setSyncing(false);
  }, []);

  // Helper functions
  const addWeight = useCallback(async (entry: WeightEntry) => {
    const newData = { ...data };
    const existingIndex = newData.weights.findIndex(w => w.date === entry.date);

    if (existingIndex >= 0) {
      newData.weights[existingIndex] = entry;
    } else {
      newData.weights = [...newData.weights, entry];
    }

    newData.weights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (newData.weights.length > 0) {
      newData.profile.currentWeight = newData.weights[newData.weights.length - 1].weight;
    }

    await saveData(newData);
  }, [data, saveData]);

  const saveChecklist = useCallback(async (entry: ChecklistEntry) => {
    const newData = { ...data };
    const existingIndex = newData.checklists.findIndex(c => c.date === entry.date);

    if (existingIndex >= 0) {
      newData.checklists[existingIndex] = entry;
    } else {
      newData.checklists = [...newData.checklists, entry];
    }

    await saveData(newData);
  }, [data, saveData]);

  const addWorkout = useCallback(async (entry: WorkoutEntry) => {
    const newData = { ...data };
    const existingIndex = newData.workouts.findIndex(w => w.date === entry.date);

    if (existingIndex >= 0) {
      newData.workouts[existingIndex] = entry;
    } else {
      newData.workouts = [...newData.workouts, entry];
    }

    await saveData(newData);
  }, [data, saveData]);

  const addNote = useCallback(async (entry: DailyNote) => {
    const newData = { ...data };
    const existingIndex = newData.notes.findIndex(n => n.date === entry.date);

    if (existingIndex >= 0) {
      newData.notes[existingIndex] = entry;
    } else {
      newData.notes = [...newData.notes, entry];
    }

    await saveData(newData);
  }, [data, saveData]);

  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    const newData = { ...data };
    newData.profile = { ...newData.profile, ...profile };
    await saveData(newData);
  }, [data, saveData]);

  // Computed stats
  const getStats = useCallback(() => {
    const { profile, weights, checklists } = data;

    const totalToLose = profile.startWeight - profile.goalWeight;
    const currentLoss = profile.startWeight - profile.currentWeight;
    const progressPercent = totalToLose > 0 ? (currentLoss / totalToLose) * 100 : 0;

    const startDate = new Date(profile.startDate);
    const today = new Date();
    const daysIn = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const weeklyLossRate = daysIn > 7 ? (currentLoss / daysIn) * 7 : 0;

    // Compliance: how many days in the last 7 had 100% checklist completion
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const completedDays = last7Days.filter(date => {
      const entry = checklists.find(c => c.date === date);
      return entry && entry.checkedItems.length >= 8; // Assume 8-10 items per day
    }).length;

    return {
      totalToLose,
      currentLoss,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      daysIn,
      weeklyLossRate,
      remainingKg: totalToLose - currentLoss,
      compliance7Days: completedDays,
      estimatedWeeksLeft: weeklyLossRate > 0 ? (totalToLose - currentLoss) / weeklyLossRate : 0,
    };
  }, [data]);

  return {
    data,
    loading,
    syncing,
    addWeight,
    saveChecklist,
    addWorkout,
    addNote,
    updateProfile,
    getStats,
    reload: loadData,
  };
}
