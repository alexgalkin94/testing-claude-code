'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, ChevronDown, Cloud, CloudOff } from 'lucide-react';
import Card from '@/components/Card';
import CutProgress from '@/components/CutProgress';
import QuickLog from '@/components/QuickLog';
import {
  DAY_A,
  DAY_B,
  DayPlan,
  MealItem,
  getDayType,
  setDayType as saveDayType,
} from '@/lib/mealPlan';

// Local storage keys
const CHECKLIST_KEY = 'cutboard_checklist';
const WORKOUT_KEY = 'cutboard_workouts';
const NOTES_KEY = 'cutboard_notes';
const WEIGHTS_KEY = 'cutboard_weights';
const PROFILE_KEY = 'cutboard_profile';

interface CheckedItems {
  [date: string]: string[];
}

interface WorkoutEntry {
  date: string;
  type: string;
  feeling: number;
}

interface NoteEntry {
  date: string;
  energy: number;
  hunger: number;
  sleep: number;
}

interface WeightEntry {
  date: string;
  weight: number;
}

interface Profile {
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  startDate: string;
}

const DEFAULT_PROFILE: Profile = {
  startWeight: 90,
  currentWeight: 90,
  goalWeight: 82,
  startDate: '2024-12-01',
};

export default function TodayPage() {
  const [dayType, setDayTypeState] = useState<'A' | 'B'>('A');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutEntry | undefined>();
  const [todayNote, setTodayNote] = useState<NoteEntry | undefined>();

  const today = format(new Date(), 'yyyy-MM-dd');
  const plan: DayPlan = dayType === 'A' ? DAY_A : DAY_B;

  // Load all data on mount
  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  const loadAllData = () => {
    // Day type
    const savedType = getDayType();
    setDayTypeState(savedType);

    // Profile
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }

    // Weights
    const savedWeights = localStorage.getItem(WEIGHTS_KEY);
    if (savedWeights) {
      const w = JSON.parse(savedWeights) as WeightEntry[];
      setWeights(w);
      if (w.length > 0) {
        setProfile(prev => ({ ...prev, currentWeight: w[w.length - 1].weight }));
      }
    }

    // Checklist
    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    if (savedChecklist) {
      const allChecked: CheckedItems = JSON.parse(savedChecklist);
      if (allChecked[today]) {
        setCheckedItems(new Set(allChecked[today]));
      }
    }

    // Today's workout
    const savedWorkouts = localStorage.getItem(WORKOUT_KEY);
    if (savedWorkouts) {
      const workouts: WorkoutEntry[] = JSON.parse(savedWorkouts);
      const todayW = workouts.find(w => w.date === today);
      if (todayW) setTodayWorkout(todayW);
    }

    // Today's note
    const savedNotes = localStorage.getItem(NOTES_KEY);
    if (savedNotes) {
      const notes: NoteEntry[] = JSON.parse(savedNotes);
      const todayN = notes.find(n => n.date === today);
      if (todayN) setTodayNote(todayN);
    }

    // Try to sync from server
    syncFromServer();
  };

  // Sync from server
  const syncFromServer = async () => {
    try {
      const response = await fetch('/api/sync');
      if (response.ok) {
        const serverData = await response.json();
        if (serverData) {
          // Update local storage with server data if newer
          // For now, just mark as synced
          setSyncError(false);
        }
      }
    } catch {
      setSyncError(true);
    }
  };

  // Sync to server
  const syncToServer = useCallback(async () => {
    setSyncing(true);
    try {
      const data = {
        profile,
        weights,
        checkedItems: Object.fromEntries([[today, Array.from(checkedItems)]]),
        workouts: todayWorkout ? [todayWorkout] : [],
        notes: todayNote ? [todayNote] : [],
        lastSync: new Date().toISOString(),
      };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSyncError(false);
      } else {
        setSyncError(true);
      }
    } catch {
      setSyncError(true);
    }
    setSyncing(false);
  }, [profile, weights, checkedItems, todayWorkout, todayNote, today]);

  // Reload checked items when day type changes
  useEffect(() => {
    if (!mounted) return;
    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    if (savedChecklist) {
      const allChecked: CheckedItems = JSON.parse(savedChecklist);
      if (allChecked[today]) {
        setCheckedItems(new Set(allChecked[today]));
      } else {
        setCheckedItems(new Set());
      }
    }
  }, [dayType, today, mounted]);

  const handleToggle = (itemId: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      // Save to localStorage
      const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
      const allChecked: CheckedItems = savedChecklist ? JSON.parse(savedChecklist) : {};
      allChecked[today] = Array.from(next);
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(allChecked));

      // Sync to server (debounced)
      setTimeout(syncToServer, 1000);

      return next;
    });
  };

  const handleDayChange = (type: 'A' | 'B') => {
    setDayTypeState(type);
    saveDayType(type);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleLogWorkout = (type: string, feeling: number) => {
    const entry: WorkoutEntry = { date: today, type, feeling };
    setTodayWorkout(entry);

    const savedWorkouts = localStorage.getItem(WORKOUT_KEY);
    const workouts: WorkoutEntry[] = savedWorkouts ? JSON.parse(savedWorkouts) : [];
    const existingIndex = workouts.findIndex(w => w.date === today);
    if (existingIndex >= 0) {
      workouts[existingIndex] = entry;
    } else {
      workouts.push(entry);
    }
    localStorage.setItem(WORKOUT_KEY, JSON.stringify(workouts));
    syncToServer();
  };

  const handleLogWellbeing = (energy: number, hunger: number, sleep: number) => {
    const entry: NoteEntry = { date: today, energy, hunger, sleep };
    setTodayNote(entry);

    const savedNotes = localStorage.getItem(NOTES_KEY);
    const notes: NoteEntry[] = savedNotes ? JSON.parse(savedNotes) : [];
    const existingIndex = notes.findIndex(n => n.date === today);
    if (existingIndex >= 0) {
      notes[existingIndex] = entry;
    } else {
      notes.push(entry);
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    syncToServer();
  };

  // Calculate consumed macros
  const consumed = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  plan.meals.forEach(meal => {
    meal.items.forEach(item => {
      if (checkedItems.has(item.id)) {
        consumed.calories += item.calories;
        consumed.protein += item.protein;
        consumed.carbs += item.carbs;
        consumed.fat += item.fat;
      }
    });
  });

  const completedCount = checkedItems.size;
  const totalItems = plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);

  // Calculate weekly loss rate
  const startDate = new Date(profile.startDate);
  const daysIn = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalLoss = profile.startWeight - profile.currentWeight;
  const weeklyLossRate = daysIn > 7 ? (totalLoss / daysIn) * 7 : 0;

  if (!mounted) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-[#1a1a24] rounded w-1/2 mb-4"></div>
        <div className="h-12 bg-[#1a1a24] rounded-xl mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-[#1a1a24] rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* Header with Sync Status */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-sm">
            {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
          </p>
          <h1 className="text-2xl font-bold">Hey Alex 👋</h1>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {syncing ? (
            <Cloud size={14} className="animate-pulse text-[#8b5cf6]" />
          ) : syncError ? (
            <CloudOff size={14} className="text-[#ef4444]" />
          ) : (
            <Cloud size={14} className="text-[#10b981]" />
          )}
        </div>
      </div>

      {/* Cut Progress */}
      <CutProgress
        startWeight={profile.startWeight}
        currentWeight={profile.currentWeight}
        goalWeight={profile.goalWeight}
        startDate={profile.startDate}
        weeklyLossRate={weeklyLossRate}
        daysIn={daysIn}
      />

      {/* Quick Logs */}
      <QuickLog
        onLogWorkout={handleLogWorkout}
        onLogWellbeing={handleLogWellbeing}
        todayWorkout={todayWorkout}
        todayNote={todayNote}
      />

      {/* Day Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleDayChange('A')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${
            dayType === 'A'
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25'
              : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252532]'
          }`}
        >
          Tag A
        </button>
        <button
          onClick={() => handleDayChange('B')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${
            dayType === 'B'
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25'
              : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252532]'
          }`}
        >
          Tag B
        </button>
      </div>

      {/* Progress Bar */}
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Mahlzeiten</span>
          <span className="text-sm font-medium">{completedCount}/{totalItems}</span>
        </div>
        <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#10b981] transition-all duration-300"
            style={{ width: `${(completedCount / totalItems) * 100}%` }}
          />
        </div>

        {/* Macro Summary */}
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10">
          <div className="text-center">
            <p className="text-base font-bold text-[#8b5cf6]">{consumed.calories}</p>
            <p className="text-[9px] text-gray-400">/{plan.totals.calories}</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#10b981]">{consumed.protein}g</p>
            <p className="text-[9px] text-gray-400">/{plan.totals.protein}g P</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#f59e0b]">{consumed.carbs}g</p>
            <p className="text-[9px] text-gray-400">/{plan.totals.carbs}g K</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#ef4444]">{consumed.fat}g</p>
            <p className="text-[9px] text-gray-400">/{plan.totals.fat}g F</p>
          </div>
        </div>
      </Card>

      {/* Meals */}
      <div className="space-y-3">
        {plan.meals.map(meal => (
          <Card key={meal.id}>
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-semibold text-sm">{meal.name}</h3>
                <p className="text-[10px] text-gray-400">{meal.time}</p>
              </div>
              <div className="text-right text-xs text-gray-400">
                {meal.items.filter(i => checkedItems.has(i.id)).length}/{meal.items.length}
              </div>
            </div>

            <div className="space-y-1.5">
              {meal.items.map(item => (
                <MealItemRow
                  key={item.id}
                  item={item}
                  checked={checkedItems.has(item.id)}
                  expanded={expandedItems.has(item.id)}
                  onToggle={() => handleToggle(item.id)}
                  onExpand={() => toggleExpanded(item.id)}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MealItemRow({
  item,
  checked,
  expanded,
  onToggle,
  onExpand,
}: {
  item: MealItem;
  checked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const hasOptions = item.options && item.options.length > 0;

  return (
    <div className={`rounded-lg transition-all ${checked ? 'bg-[#10b981]/10' : 'bg-[#1a1a24]'}`}>
      <div className="flex items-center gap-2 p-2.5">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
            checked
              ? 'bg-[#10b981] text-white'
              : 'bg-[#252532] border border-white/10'
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${checked ? 'text-gray-400 line-through' : ''}`}>
              {item.name}
            </span>
            {hasOptions && (
              <button
                onClick={onExpand}
                className="text-gray-500 hover:text-gray-300"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>

          {/* Macros */}
          <div className="flex gap-2 mt-0.5 text-[9px]">
            <span className="text-[#8b5cf6]">{item.calories}</span>
            <span className="text-[#10b981]">{item.protein}P</span>
            <span className="text-[#f59e0b]">{item.carbs}K</span>
            <span className="text-[#ef4444]">{item.fat}F</span>
          </div>
        </div>
      </div>

      {/* Options dropdown */}
      {hasOptions && expanded && (
        <div className="px-2.5 pb-2 pt-0">
          <div className="pl-7 space-y-0.5">
            {item.options!.map((option, i) => (
              <div key={i} className="text-[10px] text-gray-400">
                • {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
