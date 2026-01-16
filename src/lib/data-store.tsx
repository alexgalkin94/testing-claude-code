'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MealPlan,
  DaySnapshot,
  ItemOverride,
  DEFAULT_PLAN_A,
  DEFAULT_PLAN_B,
} from './mealPlan';

// All app data in one place
export interface AppData {
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
  weights: Array<{ date: string; weight: number }>;
  checklist: { [date: string]: string[] };
  extraCalories: { [date: string]: number };
  dayTypes: { [date: string]: 'A' | 'B' };
  mealPlans: { [planId: string]: MealPlan };
  dayPlanIds: { [date: string]: string };
  daySnapshots: { [date: string]: DaySnapshot };
  migrationVersion?: number;
  lastSync?: string;
}

const CURRENT_MIGRATION_VERSION = 4;
const LOCAL_STORAGE_KEY = 'cutboard_all_data';
const QUERY_KEY = ['appData'];

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
  mealPlans: {},
  dayPlanIds: {},
  daySnapshots: {},
  migrationVersion: CURRENT_MIGRATION_VERSION,
};

// Migration function
function migrateData(data: Partial<AppData>): AppData {
  const today = new Date().toISOString().split('T')[0];

  const migrated: AppData = {
    ...DEFAULT_DATA,
    ...data,
    profile: { ...DEFAULT_DATA.profile, ...data?.profile },
    mealPlans: data.mealPlans || {},
    dayPlanIds: data.dayPlanIds || {},
    daySnapshots: data.daySnapshots || {},
  };

  const needsMigration = !data.migrationVersion || data.migrationVersion < CURRENT_MIGRATION_VERSION;

  if (needsMigration && data.dayTypes && Object.keys(data.dayTypes).length > 0) {
    for (const [date, dayType] of Object.entries(data.dayTypes)) {
      if (date === today) continue;
      const plan = dayType === 'A' ? DEFAULT_PLAN_A : DEFAULT_PLAN_B;
      if (!migrated.dayPlanIds[date]) {
        migrated.dayPlanIds[date] = plan.id;
      }
      if (!migrated.daySnapshots[date]) {
        migrated.daySnapshots[date] = {
          planId: plan.id,
          planName: plan.name,
          meals: plan.meals,
          overrides: [],
        };
      }
    }
  }

  migrated.migrationVersion = CURRENT_MIGRATION_VERSION;
  return migrated;
}

// localStorage helpers
function getLocalData(): AppData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return migrateData(JSON.parse(cached));
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return null;
}

function setLocalData(data: AppData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// API functions
async function fetchData(): Promise<AppData> {
  // First try localStorage for instant load
  const localData = getLocalData();

  try {
    const response = await fetch('/api/sync');
    if (response.ok) {
      const serverData = await response.json();
      if (serverData) {
        const migrated = migrateData(serverData);

        // Compare timestamps - use newer data
        const localLastSync = localData?.lastSync;
        const serverLastSync = migrated.lastSync;

        if (localLastSync && serverLastSync && localLastSync > serverLastSync) {
          // Local is newer, keep it and sync to server
          console.log('Local data is newer, keeping it');
          return localData;
        }

        // Server is newer or equal, use it
        setLocalData(migrated);
        return migrated;
      }
    }
  } catch (e) {
    console.error('Failed to fetch from server:', e);
  }

  // Fallback to local data or defaults
  return localData || DEFAULT_DATA;
}

async function saveData(data: AppData): Promise<AppData> {
  const dataWithTimestamp = { ...data, lastSync: new Date().toISOString() };

  // Save to localStorage immediately
  setLocalData(dataWithTimestamp);

  // Sync to server
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataWithTimestamp),
  });

  if (!response.ok) {
    throw new Error('Sync failed');
  }

  const result = await response.json();
  const finalData = { ...dataWithTimestamp, lastSync: result.lastSync };
  setLocalData(finalData);

  return finalData;
}

// Context type
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
  createPlan: (plan: MealPlan) => void;
  updatePlan: (plan: MealPlan) => void;
  deletePlan: (planId: string) => void;
  setDayPlanId: (date: string, planId: string) => void;
  getDayPlanId: (date: string) => string;
  getDayPlan: (date: string) => MealPlan | null;
  getDaySnapshot: (date: string) => DaySnapshot | null;
  setDayOverride: (date: string, itemId: string, updates: { quantity?: number; alternativeId?: string }) => void;
  removeDayOverride: (date: string, itemId: string) => void;
  getDayOverrides: (date: string) => ItemOverride[];
  ensureDaySnapshot: (date: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Main data query
  const { data: queryData, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchData,
    initialData: () => getLocalData() || undefined,
    staleTime: 1000 * 60, // 1 minute
  });

  const data = queryData || DEFAULT_DATA;

  // Mutation for saving data
  const mutation = useMutation({
    mutationFn: saveData,
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AppData>(QUERY_KEY);

      // Optimistically update
      queryClient.setQueryData(QUERY_KEY, newData);
      setLocalData(newData);

      return { previousData };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEY, context.previousData);
        setLocalData(context.previousData);
      }
      console.error('Sync error:', err);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const isSyncing = mutation.isPending;
  const lastSyncError = mutation.isError ? 'Sync fehlgeschlagen' : null;

  // Helper to update data
  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    const currentData = queryClient.getQueryData<AppData>(QUERY_KEY) || DEFAULT_DATA;
    const newData = updater(currentData);
    mutation.mutate(newData);
  }, [queryClient, mutation]);

  // Profile
  const updateProfile = useCallback((profile: Partial<AppData['profile']>) => {
    updateData(prev => ({
      ...prev,
      profile: { ...prev.profile, ...profile },
    }));
  }, [updateData]);

  // Weight
  const addWeight = useCallback((date: string, weight: number) => {
    updateData(prev => {
      const existingIndex = prev.weights.findIndex(w => w.date === date);
      const newWeights = existingIndex >= 0
        ? prev.weights.map((w, i) => i === existingIndex ? { date, weight } : w)
        : [...prev.weights, { date, weight }].sort((a, b) => a.date.localeCompare(b.date));
      return {
        ...prev,
        weights: newWeights,
        profile: { ...prev.profile, currentWeight: weight },
      };
    });
  }, [updateData]);

  // Checklist
  const toggleChecklistItem = useCallback((date: string, itemId: string) => {
    updateData(prev => {
      const current = prev.checklist[date] || [];
      const newItems = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return {
        ...prev,
        checklist: { ...prev.checklist, [date]: newItems },
      };
    });
  }, [updateData]);

  const setChecklistItems = useCallback((date: string, items: string[]) => {
    updateData(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [date]: items },
    }));
  }, [updateData]);

  // Extra calories
  const setExtraCalories = useCallback((date: string, calories: number) => {
    updateData(prev => ({
      ...prev,
      extraCalories: { ...prev.extraCalories, [date]: calories },
    }));
  }, [updateData]);

  // Day type (legacy)
  const setDayType = useCallback((date: string, type: 'A' | 'B') => {
    updateData(prev => ({
      ...prev,
      dayTypes: { ...prev.dayTypes, [date]: type },
    }));
  }, [updateData]);

  const getDayType = useCallback((date: string): 'A' | 'B' => {
    return data.dayTypes?.[date] || 'A';
  }, [data.dayTypes]);

  // Meal plans
  const createPlan = useCallback((plan: MealPlan) => {
    updateData(prev => ({
      ...prev,
      mealPlans: { ...prev.mealPlans, [plan.id]: plan },
    }));
  }, [updateData]);

  const updatePlan = useCallback((plan: MealPlan) => {
    updateData(prev => ({
      ...prev,
      mealPlans: { ...prev.mealPlans, [plan.id]: plan },
    }));
  }, [updateData]);

  const deletePlan = useCallback((planId: string) => {
    updateData(prev => {
      const { [planId]: _, ...rest } = prev.mealPlans;
      return { ...prev, mealPlans: rest };
    });
  }, [updateData]);

  // Day plan selection
  const setDayPlanId = useCallback((date: string, planId: string) => {
    updateData(prev => ({
      ...prev,
      dayPlanIds: { ...prev.dayPlanIds, [date]: planId },
      dayTypes: {
        ...prev.dayTypes,
        [date]: planId === DEFAULT_PLAN_A.id ? 'A' : 'B',
      },
    }));
  }, [updateData]);

  const getDayPlanId = useCallback((date: string): string => {
    if (data.dayPlanIds?.[date]) {
      return data.dayPlanIds[date];
    }
    const legacyType = data.dayTypes?.[date];
    if (legacyType) {
      return legacyType === 'A' ? DEFAULT_PLAN_A.id : DEFAULT_PLAN_B.id;
    }
    return DEFAULT_PLAN_A.id;
  }, [data.dayPlanIds, data.dayTypes]);

  // Day plan/snapshot
  const getDayPlan = useCallback((date: string): MealPlan | null => {
    const snapshot = data.daySnapshots?.[date];
    if (snapshot) {
      return {
        id: snapshot.planId,
        name: 'Snapshot',
        meals: snapshot.meals,
      };
    }
    const planId = getDayPlanId(date);
    if (planId === DEFAULT_PLAN_A.id) return DEFAULT_PLAN_A;
    if (planId === DEFAULT_PLAN_B.id) return DEFAULT_PLAN_B;
    return data.mealPlans[planId] || DEFAULT_PLAN_A;
  }, [data.daySnapshots, data.mealPlans, getDayPlanId]);

  const getDaySnapshot = useCallback((date: string): DaySnapshot | null => {
    return data.daySnapshots?.[date] || null;
  }, [data.daySnapshots]);

  // Day overrides
  const setDayOverride = useCallback((date: string, itemId: string, updates: { quantity?: number; alternativeId?: string }) => {
    updateData(prev => {
      const snapshot = prev.daySnapshots[date];
      if (!snapshot) return prev;

      const existingIndex = snapshot.overrides?.findIndex(o => o.itemId === itemId) ?? -1;
      const newOverride: ItemOverride = { itemId, ...updates };
      const newOverrides = existingIndex >= 0
        ? snapshot.overrides.map((o, i) => i === existingIndex ? { ...o, ...updates } : o)
        : [...(snapshot.overrides || []), newOverride];

      return {
        ...prev,
        daySnapshots: {
          ...prev.daySnapshots,
          [date]: { ...snapshot, overrides: newOverrides },
        },
      };
    });
  }, [updateData]);

  const removeDayOverride = useCallback((date: string, itemId: string) => {
    updateData(prev => {
      const snapshot = prev.daySnapshots[date];
      if (!snapshot) return prev;

      return {
        ...prev,
        daySnapshots: {
          ...prev.daySnapshots,
          [date]: {
            ...snapshot,
            overrides: snapshot.overrides?.filter(o => o.itemId !== itemId) || [],
          },
        },
      };
    });
  }, [updateData]);

  const getDayOverrides = useCallback((date: string): ItemOverride[] => {
    return data.daySnapshots?.[date]?.overrides || [];
  }, [data.daySnapshots]);

  // Ensure day snapshot exists
  const ensureDaySnapshot = useCallback((date: string) => {
    if (data.daySnapshots?.[date]) return;

    const planId = getDayPlanId(date);
    let plan: MealPlan;
    if (planId === DEFAULT_PLAN_A.id) {
      plan = DEFAULT_PLAN_A;
    } else if (planId === DEFAULT_PLAN_B.id) {
      plan = DEFAULT_PLAN_B;
    } else {
      plan = data.mealPlans[planId] || DEFAULT_PLAN_A;
    }

    updateData(prev => ({
      ...prev,
      daySnapshots: {
        ...prev.daySnapshots,
        [date]: {
          planId: plan.id,
          planName: plan.name,
          meals: JSON.parse(JSON.stringify(plan.meals)),
          overrides: [],
        },
      },
    }));
  }, [data.daySnapshots, data.mealPlans, getDayPlanId, updateData]);

  // Force sync
  const forceSync = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return (
    <DataContext.Provider
      value={{
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
        createPlan,
        updatePlan,
        deletePlan,
        setDayPlanId,
        getDayPlanId,
        getDayPlan,
        getDaySnapshot,
        setDayOverride,
        removeDayOverride,
        getDayOverrides,
        ensureDaySnapshot,
      }}
    >
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
