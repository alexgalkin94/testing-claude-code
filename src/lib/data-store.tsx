'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// All app data in one place
export interface AppData {
  // Profile
  profile: {
    name: string;
    startWeight: number;
    currentWeight: number;
    goalWeight: number;
    startDate: string;
    calorieTarget: number;
    proteinTarget: number;
    tdee: number;
    calculatedTdee?: number;
    showPhotosTab: boolean;
    blurPhotos: boolean;
  };
  // Weights
  weights: Array<{
    date: string;
    weight: number;
  }>;
  // Checklist (items checked per day)
  checklist: {
    [date: string]: string[];
  };
  // Extra calories per day (snacks, cheat meals, etc.)
  extraCalories: {
    [date: string]: number;
  };
  // Day type per date (A or B)
  dayTypes: {
    [date: string]: 'A' | 'B';
  };
  // Metadata
  lastSync?: string;
}

const DEFAULT_DATA: AppData = {
  profile: {
    name: '',
    startWeight: 90,
    currentWeight: 90,
    goalWeight: 82,
    startDate: new Date().toISOString().split('T')[0],
    calorieTarget: 1700,
    proteinTarget: 157,
    tdee: 2125,
    showPhotosTab: true,
    blurPhotos: false,
  },
  weights: [],
  checklist: {},
  extraCalories: {},
  dayTypes: {},
};

const LOCAL_STORAGE_KEY = 'cutboard_all_data';

interface DataContextType {
  data: AppData;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
  updateProfile: (profile: Partial<AppData['profile']>) => void;
  addWeight: (date: string, weight: number) => void;
  toggleChecklistItem: (date: string, itemId: string) => void;
  setChecklistItems: (date: string, items: string[]) => void;
  setExtraCalories: (date: string, calories: number) => void;
  setDayType: (date: string, type: 'A' | 'B') => void;
  getDayType: (date: string) => 'A' | 'B';
  forceSync: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Refresh from server when tab becomes visible or window gets focus
  useEffect(() => {
    const refreshFromServer = async () => {
      if (!initialized) return;

      try {
        const response = await fetch('/api/sync');
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData.lastSync) {
            // Only update if server has newer data
            const localLastSync = data.lastSync;
            if (!localLastSync || serverData.lastSync > localLastSync) {
              const merged = {
                ...DEFAULT_DATA,
                ...serverData,
                profile: { ...DEFAULT_DATA.profile, ...serverData?.profile },
              };
              setData(merged);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              console.log('Refreshed from server:', serverData.lastSync);
            }
          }
        }
      } catch (e) {
        console.error('Background refresh failed:', e);
      }
    };

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFromServer();
      }
    };

    // Refresh when window gets focus
    const handleFocus = () => {
      refreshFromServer();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialized, data.lastSync]);

  const loadData = async () => {
    setIsLoading(true);

    // First, try to load from localStorage (fast)
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData({
          ...DEFAULT_DATA,
          ...parsed,
          profile: { ...DEFAULT_DATA.profile, ...parsed?.profile },
        });
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }

    // Then, load from server (source of truth)
    try {
      const response = await fetch('/api/sync');
      if (response.ok) {
        const serverData = await response.json();
        if (serverData) {
          const merged = {
            ...DEFAULT_DATA,
            ...serverData,
            profile: { ...DEFAULT_DATA.profile, ...serverData?.profile },
          };
          setData(merged);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (e) {
      console.error('Failed to load from server:', e);
      setLastSyncError('Server nicht erreichbar');
    }

    setIsLoading(false);
    setInitialized(true);
  };

  // Sync to server
  const syncToServer = useCallback(async (newData: AppData) => {
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      console.log('Synced at:', result.lastSync);
    } catch (e) {
      console.error('Sync error:', e);
      setLastSyncError('Sync fehlgeschlagen');
    }

    setIsSyncing(false);
  }, []);

  // Update data and sync
  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const newData = updater(prev);

      // Save to localStorage immediately
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));

      // Sync to server (debounced would be better but let's keep it simple)
      syncToServer(newData);

      return newData;
    });
  }, [syncToServer]);

  // Profile update
  const updateProfile = useCallback((profile: Partial<AppData['profile']>) => {
    updateData(prev => ({
      ...prev,
      profile: { ...prev.profile, ...profile },
    }));
  }, [updateData]);

  // Add weight
  const addWeight = useCallback((date: string, weight: number) => {
    updateData(prev => {
      const newWeights = prev.weights.filter(w => w.date !== date);
      newWeights.push({ date, weight });
      newWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Also update currentWeight in profile
      const latestWeight = newWeights[newWeights.length - 1]?.weight || prev.profile.currentWeight;

      return {
        ...prev,
        weights: newWeights,
        profile: { ...prev.profile, currentWeight: latestWeight },
      };
    });
  }, [updateData]);

  // Toggle checklist item
  const toggleChecklistItem = useCallback((date: string, itemId: string) => {
    updateData(prev => {
      const dayItems = prev.checklist[date] || [];
      const newItems = dayItems.includes(itemId)
        ? dayItems.filter(id => id !== itemId)
        : [...dayItems, itemId];

      return {
        ...prev,
        checklist: { ...prev.checklist, [date]: newItems },
      };
    });
  }, [updateData]);

  // Set all checklist items for a day
  const setChecklistItems = useCallback((date: string, items: string[]) => {
    updateData(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [date]: items },
    }));
  }, [updateData]);

  // Set extra calories for a day
  const setExtraCalories = useCallback((date: string, calories: number) => {
    updateData(prev => ({
      ...prev,
      extraCalories: { ...prev.extraCalories, [date]: calories },
    }));
  }, [updateData]);

  // Set day type for a specific date
  const setDayType = useCallback((date: string, type: 'A' | 'B') => {
    updateData(prev => ({
      ...prev,
      dayTypes: { ...prev.dayTypes, [date]: type },
    }));
  }, [updateData]);

  // Get day type for a specific date (defaults to 'A' if not set)
  const getDayType = useCallback((date: string): 'A' | 'B' => {
    return data.dayTypes?.[date] || 'A';
  }, [data.dayTypes]);

  // Force sync
  const forceSync = useCallback(async () => {
    await syncToServer(data);
  }, [data, syncToServer]);

  return (
    <DataContext.Provider value={{
      data,
      isLoading,
      isSyncing,
      lastSyncError,
      updateProfile,
      addWeight,
      toggleChecklistItem,
      setChecklistItems,
      setExtraCalories,
      setDayType,
      getDayType,
      forceSync,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
