'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, addDays, isToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, ChevronDown, Scale, Flame, TrendingDown, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import Card from '@/components/Card';
import {
  DAY_A,
  DAY_B,
  DayPlan,
  MealItem,
  Meal,
  getDayType,
  setDayType as saveDayType,
} from '@/lib/mealPlan';

const CHECKLIST_KEY = 'cutboard_checklist';
const WEIGHTS_KEY = 'cutboard_weights';
const PROFILE_KEY = 'cutboard_profile';

interface CheckedItems {
  [date: string]: string[];
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
  const [allCheckedDays, setAllCheckedDays] = useState<CheckedItems>({});
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const plan: DayPlan = dayType === 'A' ? DAY_A : DAY_B;

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  const loadAllData = () => {
    const savedType = getDayType();
    setDayTypeState(savedType);

    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    const savedWeights = localStorage.getItem(WEIGHTS_KEY);
    if (savedWeights) {
      const w = JSON.parse(savedWeights) as WeightEntry[];
      setWeights(w);
      if (w.length > 0) {
        setProfile(prev => ({ ...prev, currentWeight: w[w.length - 1].weight }));
      }
    }

    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    if (savedChecklist) {
      const allChecked: CheckedItems = JSON.parse(savedChecklist);
      setAllCheckedDays(allChecked);
      const today = format(new Date(), 'yyyy-MM-dd');
      if (allChecked[today]) {
        setCheckedItems(new Set(allChecked[today]));
      }
    }

    syncFromServer();
  };

  const syncFromServer = async () => {
    try {
      await fetch('/api/sync');
    } catch {}
  };

  const syncToServer = useCallback(async () => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, weights, lastSync: new Date().toISOString() }),
      });
    } catch {}
  }, [profile, weights]);

  // Load checklist when date or dayType changes
  useEffect(() => {
    if (!mounted) return;
    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    if (savedChecklist) {
      const allChecked: CheckedItems = JSON.parse(savedChecklist);
      setCheckedItems(new Set(allChecked[selectedDateStr] || []));
    } else {
      setCheckedItems(new Set());
    }
  }, [dayType, selectedDateStr, mounted]);

  const saveCheckedItems = (items: Set<string>) => {
    const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
    const allChecked: CheckedItems = savedChecklist ? JSON.parse(savedChecklist) : {};
    allChecked[selectedDateStr] = Array.from(items);
    setAllCheckedDays(allChecked);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(allChecked));
  };

  const handleToggle = (itemId: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      saveCheckedItems(next);
      return next;
    });
  };

  const handleToggleMeal = (meal: Meal) => {
    const mealItemIds = meal.items.map(i => i.id);
    const allChecked = mealItemIds.every(id => checkedItems.has(id));

    setCheckedItems(prev => {
      const next = new Set(prev);
      if (allChecked) {
        // Uncheck all
        mealItemIds.forEach(id => next.delete(id));
      } else {
        // Check all
        mealItemIds.forEach(id => next.add(id));
      }
      saveCheckedItems(next);
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
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleQuickWeight = () => {
    const weight = parseFloat(weightInput);
    if (!weight || weight < 30 || weight > 300) return;

    const newEntry = { date: todayStr, weight };
    const newWeights = [...weights.filter(w => w.date !== todayStr), newEntry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setWeights(newWeights);
    setProfile(prev => ({ ...prev, currentWeight: weight }));
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(newWeights));
    setShowWeightInput(false);
    setWeightInput('');
    syncToServer();
  };

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const totalItemsNeeded = plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);

    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayChecked = allCheckedDays[date] || [];
      if (dayChecked.length >= totalItemsNeeded * 0.8) { // 80% completion counts
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const completedCount = checkedItems.size;
  const totalItems = plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  // Stats
  const totalLoss = profile.startWeight - profile.currentWeight;
  const remaining = profile.currentWeight - profile.goalWeight;

  // Consumed macros
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

  const isViewingToday = isToday(selectedDate);

  if (!mounted) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* Date Selector */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousDay}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={20} className="text-zinc-400" />
        </button>

        <div className="text-center">
          <button
            onClick={goToToday}
            className={`text-sm mb-0.5 ${isViewingToday ? 'text-zinc-500' : 'text-white underline'}`}
            disabled={isViewingToday}
          >
            {isViewingToday ? (
              <span className="text-zinc-500">{format(selectedDate, 'EEEE', { locale: de })}</span>
            ) : (
              'Heute'
            )}
          </button>
          <h1 className="text-xl font-semibold tracking-tight">
            {format(selectedDate, 'd. MMMM', { locale: de })}
          </h1>
        </div>

        <button
          onClick={goToNextDay}
          disabled={isViewingToday}
          className={`p-2 rounded-lg transition-colors ${
            isViewingToday ? 'opacity-30' : 'hover:bg-zinc-800'
          }`}
        >
          <ChevronRight size={20} className="text-zinc-400" />
        </button>
      </div>

      {/* Stats Row - only show on today */}
      {isViewingToday && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Weight Card */}
          <button
            onClick={() => setShowWeightInput(!showWeightInput)}
            className="text-left"
          >
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale size={14} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">Gewicht</span>
              </div>
              <p className="text-lg font-semibold">{profile.currentWeight}<span className="text-xs text-zinc-500 ml-0.5">kg</span></p>
            </Card>
          </button>

          {/* Loss Card */}
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-emerald-500" />
              <span className="text-xs text-zinc-500">Verloren</span>
            </div>
            <p className="text-lg font-semibold text-emerald-500">-{totalLoss.toFixed(1)}<span className="text-xs ml-0.5">kg</span></p>
          </Card>

          {/* Streak Card */}
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} className={streak > 0 ? 'text-orange-500' : 'text-zinc-500'} />
              <span className="text-xs text-zinc-500">Streak</span>
            </div>
            <p className="text-lg font-semibold">{streak}<span className="text-xs text-zinc-500 ml-0.5">Tage</span></p>
          </Card>
        </div>
      )}

      {/* Quick Weight Input */}
      {showWeightInput && isViewingToday && (
        <Card className="mb-4 p-3">
          <div className="flex gap-2">
            <input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={profile.currentWeight.toString()}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
              step="0.1"
              autoFocus
            />
            <button
              onClick={handleQuickWeight}
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium"
            >
              Speichern
            </button>
          </div>
        </Card>
      )}

      {/* Progress to Goal - only show on today */}
      {isViewingToday && (
        <Card className="mb-6 p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-zinc-400">Noch {remaining.toFixed(1)} kg zum Ziel</span>
            <span className="text-xs text-zinc-500">{profile.goalWeight} kg</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${Math.min(100, (totalLoss / (profile.startWeight - profile.goalWeight)) * 100)}%` }}
            />
          </div>
        </Card>
      )}

      {/* Day Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleDayChange('A')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border ${
            dayType === 'A'
              ? 'bg-white text-black border-white'
              : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          Tag A
        </button>
        <button
          onClick={() => handleDayChange('B')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border ${
            dayType === 'B'
              ? 'bg-white text-black border-white'
              : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          Tag B
        </button>
      </div>

      {/* Macros Summary */}
      <Card className="mb-4 p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">
            Makros {isViewingToday ? 'heute' : format(selectedDate, 'd.M.', { locale: de })}
          </span>
          <span className="text-xs text-zinc-500">{completedCount}/{totalItems} Items</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-lg font-semibold">{consumed.calories}</p>
            <p className="text-xs text-zinc-500">/{plan.totals.calories} kcal</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{consumed.protein}</p>
            <p className="text-xs text-zinc-500">/{plan.totals.protein}g P</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{consumed.carbs}</p>
            <p className="text-xs text-zinc-500">/{plan.totals.carbs}g K</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{consumed.fat}</p>
            <p className="text-xs text-zinc-500">/{plan.totals.fat}g F</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Meals */}
      <div className="space-y-3">
        {plan.meals.map(meal => {
          const mealItemIds = meal.items.map(i => i.id);
          const checkedCount = mealItemIds.filter(id => checkedItems.has(id)).length;
          const allMealChecked = checkedCount === meal.items.length;

          return (
            <Card key={meal.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {/* Meal Checkbox */}
                <button
                  onClick={() => handleToggleMeal(meal)}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    allMealChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : checkedCount > 0
                      ? 'bg-emerald-500/30 border-emerald-500/50'
                      : 'bg-transparent border-zinc-700'
                  }`}
                >
                  {allMealChecked && <Check size={12} strokeWidth={2.5} />}
                </button>

                <div className="flex-1">
                  <h3 className={`font-medium text-sm ${allMealChecked ? 'text-zinc-500 line-through' : ''}`}>
                    {meal.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{meal.time}</p>
                </div>
                <span className="text-xs text-zinc-500">
                  {checkedCount}/{meal.items.length}
                </span>
              </div>

              <div className="space-y-2">
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
          );
        })}
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
    <div className={`rounded-lg ${checked ? 'bg-emerald-500/5' : 'bg-zinc-900'}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
            checked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-transparent border-zinc-700'
          }`}
        >
          {checked && <Check size={12} strokeWidth={2.5} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${checked ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
              {item.name}
            </span>
            {hasOptions && (
              <button onClick={onExpand} className="text-zinc-600 hover:text-zinc-400">
                <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="flex gap-3 mt-1 text-xs text-zinc-500">
            <span>{item.calories} kcal</span>
            <span>{item.protein}g P</span>
            <span>{item.carbs}g K</span>
            <span>{item.fat}g F</span>
          </div>
        </div>
      </div>

      {hasOptions && expanded && (
        <div className="px-3 pb-3">
          <div className="pl-8 space-y-1">
            {item.options!.map((option, i) => (
              <div key={i} className="text-xs text-zinc-500 flex items-center gap-2">
                <ChevronRight size={10} />
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
