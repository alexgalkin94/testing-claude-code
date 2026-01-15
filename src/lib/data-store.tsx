'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  MealPlan,
  DaySnapshot,
  ItemOverride,
  DEFAULT_MEAL_PLANS,
  DEFAULT_PLAN_A,
  DEFAULT_PLAN_B,
} from './mealPlan';

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
  // Day type per date (A or B) - LEGACY, kept for migration
  dayTypes: {
    [date: string]: 'A' | 'B';
  };
  // NEW: User-editable meal plans
  mealPlans: {
    [planId: string]: MealPlan;
  };
  // NEW: Which plan is selected for each day
  dayPlanIds: {
    [date: string]: string; // planId
  };
  // NEW: Snapshots of plans for historical days (preserves data integrity)
  daySnapshots: {
    [date: string]: DaySnapshot;
  };
  // NEW: Track if migration has been done
  migrationVersion?: number;
  // Metadata
  lastSync?: string;
}

const CURRENT_MIGRATION_VERSION = 4;

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
  mealPlans: { ...DEFAULT_MEAL_PLANS },
  dayPlanIds: {},
  daySnapshots: {},
  migrationVersion: CURRENT_MIGRATION_VERSION,
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
  // NEW: Meal plan management
  createPlan: (plan: MealPlan) => void;
  updatePlan: (plan: MealPlan) => void;
  deletePlan: (planId: string) => void;
  // NEW: Day plan selection
  setDayPlanId: (date: string, planId: string) => void;
  getDayPlanId: (date: string) => string;
  // NEW: Get effective plan for a day (snapshot if exists, else current plan)
  getDayPlan: (date: string) => MealPlan | null;
  getDaySnapshot: (date: string) => DaySnapshot | null;
  // NEW: Day overrides
  setDayOverride: (date: string, itemId: string, updates: { quantity?: number; alternativeId?: string }) => void;
  removeDayOverride: (date: string, itemId: string) => void;
  getDayOverrides: (date: string) => ItemOverride[];
  // NEW: Create snapshot for a day (called when tracking starts)
  ensureDaySnapshot: (date: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

// Migration function: converts old data format to new format
function migrateData(data: Partial<AppData>): AppData {
  const today = new Date().toISOString().split('T')[0];

  // Start with defaults merged with existing data
  const migrated: AppData = {
    ...DEFAULT_DATA,
    ...data,
    profile: { ...DEFAULT_DATA.profile, ...data?.profile },
    mealPlans: data.mealPlans && Object.keys(data.mealPlans).length > 0
      ? data.mealPlans
      : { ...DEFAULT_MEAL_PLANS },
    dayPlanIds: data.dayPlanIds || {},
    daySnapshots: data.daySnapshots || {},
  };

  // Check if we need to migrate
  const needsMigration = !data.migrationVersion || data.migrationVersion < CURRENT_MIGRATION_VERSION;

  if (needsMigration && data.dayTypes && Object.keys(data.dayTypes).length > 0) {
    console.log('Migrating old data to new format...');

    // Migrate dayTypes to dayPlanIds and create snapshots for historical days
    for (const [date, dayType] of Object.entries(data.dayTypes)) {
      // Skip today - it should use current editable plans
      if (date === today) continue;

      // Map old day type to new plan ID (use actual plan IDs)
      const plan = dayType === 'A' ? DEFAULT_PLAN_A : DEFAULT_PLAN_B;

      // Set the day plan ID if not already set
      if (!migrated.dayPlanIds[date]) {
        migrated.dayPlanIds[date] = plan.id;
      }

      // Create snapshot for historical days (preserves the exact plan data)
      if (!migrated.daySnapshots[date]) {
        migrated.daySnapshots[date] = {
          planId: plan.id,
          planName: plan.name,
          meals: JSON.parse(JSON.stringify(plan.meals)), // Deep clone
          overrides: [],
        };
      }
    }

    console.log(`Migrated ${Object.keys(data.dayTypes).length} days`);
  }

  // Always migrate old plan IDs to new ones (runs every time, not just during migration)
  if (migrated.mealPlans['default-plan-a']) {
    migrated.mealPlans[DEFAULT_PLAN_A.id] = { ...migrated.mealPlans['default-plan-a'], id: DEFAULT_PLAN_A.id };
    delete migrated.mealPlans['default-plan-a'];
  }
  if (migrated.mealPlans['default-plan-b']) {
    migrated.mealPlans[DEFAULT_PLAN_B.id] = { ...migrated.mealPlans['default-plan-b'], id: DEFAULT_PLAN_B.id };
    delete migrated.mealPlans['default-plan-b'];
  }

  // Always migrate dayPlanIds from old IDs to new IDs
  for (const [date, planId] of Object.entries(migrated.dayPlanIds)) {
    if (planId === 'default-plan-a') {
      migrated.dayPlanIds[date] = DEFAULT_PLAN_A.id;
    } else if (planId === 'default-plan-b') {
      migrated.dayPlanIds[date] = DEFAULT_PLAN_B.id;
    }
  }

  // Also migrate daySnapshots with old plan IDs
  for (const [date, snapshot] of Object.entries(migrated.daySnapshots)) {
    if (snapshot.planId === 'default-plan-a') {
      migrated.daySnapshots[date] = { ...snapshot, planId: DEFAULT_PLAN_A.id };
    } else if (snapshot.planId === 'default-plan-b') {
      migrated.daySnapshots[date] = { ...snapshot, planId: DEFAULT_PLAN_B.id };
    }
  }

  // REPAIR MIGRATION (v3): Create/fix snapshots for ALL historical days with checklist data
  // This repairs data lost due to blob caching issues
  if (data.checklist && Object.keys(data.checklist).length > 0) {
    let repairedCount = 0;

    for (const date of Object.keys(data.checklist)) {
      // Skip today
      if (date === today) continue;

      // Determine which plan was used (from dayTypes or dayPlanIds)
      const dayType = data.dayTypes?.[date];
      const dayPlanId = migrated.dayPlanIds[date];

      let plan: typeof DEFAULT_PLAN_A;
      if (dayType === 'B' || dayPlanId === DEFAULT_PLAN_B.id) {
        plan = DEFAULT_PLAN_B;
      } else {
        plan = DEFAULT_PLAN_A;
      }

      // Check if existing snapshot has corrupted data
      const existingSnapshot = migrated.daySnapshots[date];
      let needsRepair = !existingSnapshot;

      if (existingSnapshot && !needsRepair) {
        // Check if any items have suspiciously low calorie values (corruption indicator)
        for (const meal of existingSnapshot.meals) {
          for (const item of meal.items) {
            // Most food items should have meaningful caloriesPer values
            // Exception: oils/supplements that are measured in small portions
            const isLowCalItem = item.name.toLowerCase().includes('omega') ||
                                  item.name.toLowerCase().includes('supplement');
            if (item.caloriesPer !== undefined && item.caloriesPer < 10 && !isLowCalItem) {
              needsRepair = true;
              break;
            }
          }
          if (needsRepair) break;
        }
      }

      if (needsRepair) {
        // Preserve existing overrides if any
        const existingOverrides = existingSnapshot?.overrides || [];

        // Replace snapshot with DEFAULT_PLAN data (correct nutritional values)
        migrated.daySnapshots[date] = {
          planId: plan.id,
          planName: plan.name,
          meals: JSON.parse(JSON.stringify(plan.meals)),
          overrides: existingOverrides,
        };

        // Also ensure dayPlanIds is set
        if (!migrated.dayPlanIds[date]) {
          migrated.dayPlanIds[date] = plan.id;
        }

        repairedCount++;
      }
    }

    if (repairedCount > 0) {
      console.log(`Repaired ${repairedCount} days with missing/corrupted snapshots`);
    }
  }

  // Set migration version
  migrated.migrationVersion = CURRENT_MIGRATION_VERSION;

  return migrated;
}

// Deep merge helper for nested objects
function deepMergeData(target: AppData, source: Partial<AppData>): AppData {
  const result = migrateData(source);
  return result;
}

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
              const migrated = migrateData(serverData);
              setData(migrated);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(migrated));
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
        const migrated = migrateData(parsed);
        setData(migrated);
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
          const migrated = migrateData(serverData);
          setData(migrated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(migrated));
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

  // ============ NEW MEAL PLAN METHODS ============

  // Create a new plan
  const createPlan = useCallback((plan: MealPlan) => {
    updateData(prev => ({
      ...prev,
      mealPlans: { ...prev.mealPlans, [plan.id]: plan },
    }));
  }, [updateData]);

  // Update an existing plan
  const updatePlan = useCallback((plan: MealPlan) => {
    updateData(prev => ({
      ...prev,
      mealPlans: { ...prev.mealPlans, [plan.id]: plan },
    }));
  }, [updateData]);

  // Delete a plan
  const deletePlan = useCallback((planId: string) => {
    updateData(prev => {
      const newPlans = { ...prev.mealPlans };
      delete newPlans[planId];
      return { ...prev, mealPlans: newPlans };
    });
  }, [updateData]);

  // Set which plan is used for a specific day
  const setDayPlanId = useCallback((date: string, planId: string) => {
    updateData(prev => ({
      ...prev,
      dayPlanIds: { ...prev.dayPlanIds, [date]: planId },
      // Also update legacy dayTypes for backwards compatibility
      dayTypes: {
        ...prev.dayTypes,
        [date]: planId === DEFAULT_PLAN_A.id ? 'A' : 'B',
      },
    }));
  }, [updateData]);

  // Get the plan ID for a specific day
  const getDayPlanId = useCallback((date: string): string => {
    // First check new dayPlanIds
    if (data.dayPlanIds?.[date]) {
      return data.dayPlanIds[date];
    }
    // Fall back to legacy dayTypes mapping
    const legacyType = data.dayTypes?.[date];
    if (legacyType) {
      return legacyType === 'A' ? DEFAULT_PLAN_A.id : DEFAULT_PLAN_B.id;
    }
    // Default to plan A
    return DEFAULT_PLAN_A.id;
  }, [data.dayPlanIds, data.dayTypes]);

  // Get the effective plan for a day (uses snapshot if available, else defaults for past)
  const getDayPlan = useCallback((date: string): MealPlan | null => {
    const today = new Date().toISOString().split('T')[0];

    // First check if there's a snapshot for this day
    const snapshot = data.daySnapshots?.[date];
    if (snapshot) {
      // Return the snapshot as a MealPlan
      return {
        id: snapshot.planId,
        name: snapshot.planName,
        meals: snapshot.meals,
      };
    }

    // For today: use current editable plan
    if (date === today) {
      const planId = getDayPlanId(date);
      return data.mealPlans?.[planId] || null;
    }

    // For past days without snapshot: use DEFAULT_PLAN constants (not user-edited plans!)
    // This ensures historical data isn't affected by current plan edits
    const planId = getDayPlanId(date);
    if (planId === DEFAULT_PLAN_A.id) {
      return DEFAULT_PLAN_A;
    } else if (planId === DEFAULT_PLAN_B.id) {
      return DEFAULT_PLAN_B;
    }

    // For custom plans that no longer exist, fall back to plan A
    return DEFAULT_PLAN_A;
  }, [data.daySnapshots, data.mealPlans, getDayPlanId]);

  // Get the snapshot for a specific day (if exists)
  const getDaySnapshot = useCallback((date: string): DaySnapshot | null => {
    return data.daySnapshots?.[date] || null;
  }, [data.daySnapshots]);

  // Helper to get the correct plan for snapshot creation (DEFAULT for past, user plan for today)
  const getPlanForSnapshot = useCallback((date: string, prevData: AppData): MealPlan | null => {
    const today = new Date().toISOString().split('T')[0];
    const planId = prevData.dayPlanIds[date] || getDayPlanId(date);

    // For today: use current editable plan
    if (date === today) {
      return prevData.mealPlans[planId] || null;
    }

    // For past days: use DEFAULT_PLAN constants
    if (planId === DEFAULT_PLAN_A.id) {
      return DEFAULT_PLAN_A;
    } else if (planId === DEFAULT_PLAN_B.id) {
      return DEFAULT_PLAN_B;
    }

    return DEFAULT_PLAN_A;
  }, [getDayPlanId]);

  // Set an override for a specific item on a specific day
  const setDayOverride = useCallback((date: string, itemId: string, updates: { quantity?: number; alternativeId?: string }) => {
    updateData(prev => {
      const existingSnapshot = prev.daySnapshots[date];
      if (!existingSnapshot) {
        // Need to create snapshot first
        const plan = getPlanForSnapshot(date, prev);
        if (!plan) return prev;

        const newSnapshot: DaySnapshot = {
          planId: plan.id,
          planName: plan.name,
          meals: JSON.parse(JSON.stringify(plan.meals)),
          overrides: [{ itemId, ...updates }],
        };

        return {
          ...prev,
          daySnapshots: { ...prev.daySnapshots, [date]: newSnapshot },
        };
      }

      // Update existing snapshot's overrides
      const existingOverride = existingSnapshot.overrides.find(o => o.itemId === itemId);
      const newOverrides = existingSnapshot.overrides.filter(o => o.itemId !== itemId);
      newOverrides.push({ itemId, ...existingOverride, ...updates });

      return {
        ...prev,
        daySnapshots: {
          ...prev.daySnapshots,
          [date]: { ...existingSnapshot, overrides: newOverrides },
        },
      };
    });
  }, [updateData, getDayPlanId]);

  // Remove an override for a specific item on a specific day
  const removeDayOverride = useCallback((date: string, itemId: string) => {
    updateData(prev => {
      const existingSnapshot = prev.daySnapshots[date];
      if (!existingSnapshot) return prev;

      const newOverrides = existingSnapshot.overrides.filter(o => o.itemId !== itemId);

      return {
        ...prev,
        daySnapshots: {
          ...prev.daySnapshots,
          [date]: { ...existingSnapshot, overrides: newOverrides },
        },
      };
    });
  }, [updateData]);

  // Get all overrides for a specific day
  const getDayOverrides = useCallback((date: string): ItemOverride[] => {
    return data.daySnapshots?.[date]?.overrides || [];
  }, [data.daySnapshots]);

  // Ensure a snapshot exists for a day (called when tracking starts)
  const ensureDaySnapshot = useCallback((date: string) => {
    updateData(prev => {
      // If snapshot already exists, do nothing
      if (prev.daySnapshots[date]) return prev;

      // Get the correct plan (DEFAULT for past, user plan for today)
      const plan = getPlanForSnapshot(date, prev);
      if (!plan) return prev;

      // Create new snapshot
      const newSnapshot: DaySnapshot = {
        planId: plan.id,
        planName: plan.name,
        meals: JSON.parse(JSON.stringify(plan.meals)),
        overrides: [],
      };

      return {
        ...prev,
        daySnapshots: { ...prev.daySnapshots, [date]: newSnapshot },
      };
    });
  }, [updateData, getPlanForSnapshot]);

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
      // New meal plan methods
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
