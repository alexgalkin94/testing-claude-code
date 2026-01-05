'use client';

import { useState, useMemo } from 'react';
import { format, subDays, addDays, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, ChevronDown, Scale, Flame, TrendingDown, ChevronRight, ChevronLeft, Sunrise, Sun, Sunset, Cookie, Cloud, CloudOff } from 'lucide-react';
import Card from '@/components/Card';
import { useData } from '@/lib/data-store';
import {
  DAY_A,
  DAY_B,
  DayPlan,
  MealItem,
  Meal,
} from '@/lib/mealPlan';

const MealIcon = ({ icon, className, size = 16 }: { icon: 'sunrise' | 'sun' | 'sunset' | 'cookie'; className?: string; size?: number }) => {
  const iconProps = { size, className };
  switch (icon) {
    case 'sunrise': return <Sunrise {...iconProps} />;
    case 'sun': return <Sun {...iconProps} />;
    case 'sunset': return <Sunset {...iconProps} />;
    case 'cookie': return <Cookie {...iconProps} />;
  }
};

export default function TodayPage() {
  const { data, isLoading, isSyncing, lastSyncError, toggleChecklistItem, setChecklistItems, setDayType, addWeight } = useData();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const plan: DayPlan = data.dayType === 'A' ? DAY_A : DAY_B;

  // Get checked items for selected date
  const checkedItems = useMemo(() => {
    return new Set(data.checklist[selectedDateStr] || []);
  }, [data.checklist, selectedDateStr]);

  const handleToggle = (itemId: string) => {
    toggleChecklistItem(selectedDateStr, itemId);
  };

  const handleToggleMeal = (meal: Meal) => {
    const mealItemIds = meal.items.map(i => i.id);
    const currentItems = data.checklist[selectedDateStr] || [];
    const allChecked = mealItemIds.every(id => currentItems.includes(id));

    if (allChecked) {
      // Uncheck all meal items
      const newItems = currentItems.filter(id => !mealItemIds.includes(id));
      setChecklistItems(selectedDateStr, newItems);
    } else {
      // Check all meal items
      const newItems = [...new Set([...currentItems, ...mealItemIds])];
      setChecklistItems(selectedDateStr, newItems);
    }
  };

  const handleDayChange = (type: 'A' | 'B') => {
    setDayType(type);
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
    addWeight(todayStr, weight);
    setShowWeightInput(false);
    setWeightInput('');
  };

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => { if (!isToday(selectedDate)) setSelectedDate(prev => addDays(prev, 1)); };
  const goToToday = () => setSelectedDate(new Date());

  // Calculate streak
  const streak = useMemo(() => {
    let count = 0;
    const totalItemsNeeded = plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayChecked = data.checklist[date] || [];
      if (dayChecked.length >= totalItemsNeeded * 0.8) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [data.checklist, plan.meals]);

  const completedCount = checkedItems.size;
  const totalItems = plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;
  const totalLoss = data.profile.startWeight - data.profile.currentWeight;
  const remaining = data.profile.currentWeight - data.profile.goalWeight;

  const consumed = useMemo(() => {
    const result = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        if (checkedItems.has(item.id)) {
          result.calories += item.calories;
          result.protein += item.protein;
          result.carbs += item.carbs;
          result.fat += item.fat;
        }
      });
    });
    return result;
  }, [plan.meals, checkedItems]);

  const isViewingToday = isToday(selectedDate);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 lg:p-8 lg:pb-8">
      {/* Sync Status */}
      {(isSyncing || lastSyncError) && (
        <div className={`mb-4 flex items-center gap-2 text-xs ${lastSyncError ? 'text-red-400' : 'text-zinc-500'}`}>
          {isSyncing ? (
            <><Cloud size={12} className="animate-pulse" /> Synchronisiere...</>
          ) : (
            <><CloudOff size={12} /> {lastSyncError}</>
          )}
        </div>
      )}

      {/* Desktop: Two Column Layout */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">

        {/* Left Column - Stats & Controls (Desktop) */}
        <div className="lg:col-span-4 lg:space-y-6">
          {/* Date Selector */}
          <div className="flex items-center justify-between mb-6 lg:mb-0 lg:bg-zinc-900 lg:rounded-xl lg:p-4">
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
              className={`p-2 rounded-lg transition-colors ${isViewingToday ? 'opacity-30' : 'hover:bg-zinc-800'}`}
            >
              <ChevronRight size={20} className="text-zinc-400" />
            </button>
          </div>

          {/* Stats - Only on Today */}
          {isViewingToday && (
            <>
              {/* Mobile Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-6 lg:hidden">
                <button onClick={() => setShowWeightInput(!showWeightInput)} className="text-left">
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale size={14} className="text-zinc-500" />
                      <span className="text-xs text-zinc-500">Gewicht</span>
                    </div>
                    <p className="text-lg font-semibold">{data.profile.currentWeight}<span className="text-xs text-zinc-500 ml-0.5">kg</span></p>
                  </Card>
                </button>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={14} className="text-emerald-500" />
                    <span className="text-xs text-zinc-500">Verloren</span>
                  </div>
                  <p className="text-lg font-semibold text-emerald-500">-{totalLoss.toFixed(1)}<span className="text-xs ml-0.5">kg</span></p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame size={14} className={streak > 0 ? 'text-orange-500' : 'text-zinc-500'} />
                    <span className="text-xs text-zinc-500">Streak</span>
                  </div>
                  <p className="text-lg font-semibold">{streak}<span className="text-xs text-zinc-500 ml-0.5">Tage</span></p>
                </Card>
              </div>

              {/* Desktop Stats Cards */}
              <div className="hidden lg:block space-y-4">
                <button onClick={() => setShowWeightInput(!showWeightInput)} className="w-full text-left">
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Aktuelles Gewicht</p>
                        <p className="text-3xl font-semibold">{data.profile.currentWeight} <span className="text-lg text-zinc-500">kg</span></p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Scale size={24} className="text-zinc-400" />
                      </div>
                    </div>
                  </Card>
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown size={18} className="text-emerald-500" />
                      <span className="text-sm text-zinc-400">Verloren</span>
                    </div>
                    <p className="text-2xl font-semibold text-emerald-500">-{totalLoss.toFixed(1)} kg</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Flame size={18} className={streak > 0 ? 'text-orange-500' : 'text-zinc-500'} />
                      <span className="text-sm text-zinc-400">Streak</span>
                    </div>
                    <p className="text-2xl font-semibold">{streak} Tage</p>
                  </Card>
                </div>

                {/* Progress to Goal */}
                <Card className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-zinc-400">Fortschritt zum Ziel</span>
                    <span className="text-sm font-medium">{data.profile.goalWeight} kg</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${Math.min(100, (totalLoss / (data.profile.startWeight - data.profile.goalWeight)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-zinc-500">Noch {remaining.toFixed(1)} kg</p>
                </Card>
              </div>

              {/* Quick Weight Input */}
              {showWeightInput && (
                <Card className="mb-4 lg:mb-0 p-3 lg:p-4">
                  <p className="text-sm text-zinc-400 mb-2 hidden lg:block">Gewicht eintragen</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder={data.profile.currentWeight.toString()}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm lg:text-base"
                      step="0.1"
                      autoFocus
                    />
                    <button
                      onClick={handleQuickWeight}
                      className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
                    >
                      Speichern
                    </button>
                  </div>
                </Card>
              )}

              {/* Mobile Progress Bar */}
              <Card className="mb-6 p-4 lg:hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-zinc-400">Noch {remaining.toFixed(1)} kg zum Ziel</span>
                  <span className="text-xs text-zinc-500">{data.profile.goalWeight} kg</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${Math.min(100, (totalLoss / (data.profile.startWeight - data.profile.goalWeight)) * 100)}%` }}
                  />
                </div>
              </Card>
            </>
          )}

          {/* Day Toggle - Desktop Only */}
          <div className="hidden lg:block">
            <Card className="p-4">
              <p className="text-sm text-zinc-400 mb-3">Tagesplan</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDayChange('A')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                    data.dayType === 'A'
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  Tag A
                </button>
                <button
                  onClick={() => handleDayChange('B')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                    data.dayType === 'B'
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  Tag B
                </button>
              </div>
            </Card>
          </div>

          {/* Macros - Desktop */}
          <div className="hidden lg:block">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium">Makros</span>
                <span className="text-sm text-zinc-500">{completedCount}/{totalItems}</span>
              </div>
              <div className="space-y-3">
                <MacroBar label="Kalorien" current={consumed.calories} total={plan.totals.calories} unit="kcal" />
                <MacroBar label="Protein" current={consumed.protein} total={plan.totals.protein} unit="g" color="emerald" />
                <MacroBar label="Carbs" current={consumed.carbs} total={plan.totals.carbs} unit="g" color="blue" />
                <MacroBar label="Fett" current={consumed.fat} total={plan.totals.fat} unit="g" color="orange" />
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column - Meals */}
        <div className="lg:col-span-8">
          {/* Day Toggle - Mobile */}
          <div className="flex gap-2 mb-4 lg:hidden">
            <button
              onClick={() => handleDayChange('A')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border ${
                data.dayType === 'A'
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Tag A
            </button>
            <button
              onClick={() => handleDayChange('B')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border ${
                data.dayType === 'B'
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Tag B
            </button>
          </div>

          {/* Macros Summary - Mobile */}
          <Card className="mb-4 p-4 lg:hidden">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">
                Makros {isViewingToday ? 'heute' : format(selectedDate, 'd.M.', { locale: de })}
              </span>
              <span className="text-xs text-zinc-500">{completedCount}/{totalItems} Items</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-lg font-semibold">{consumed.calories}</p>
                <p className="text-xs text-zinc-500">/{plan.totals.calories}</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{consumed.protein}</p>
                <p className="text-xs text-zinc-500">/{plan.totals.protein}g</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{consumed.carbs}</p>
                <p className="text-xs text-zinc-500">/{plan.totals.carbs}g</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{consumed.fat}</p>
                <p className="text-xs text-zinc-500">/{plan.totals.fat}g</p>
              </div>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </Card>

          {/* Desktop Header */}
          <div className="hidden lg:flex lg:items-center lg:justify-between lg:mb-6">
            <h2 className="text-lg font-semibold">Mahlzeiten</h2>
            <div className="h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Meals Grid */}
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {plan.meals.map(meal => {
              const mealItemIds = meal.items.map(i => i.id);
              const mealCheckedCount = mealItemIds.filter(id => checkedItems.has(id)).length;
              const allMealChecked = mealCheckedCount === meal.items.length;

              return (
                <Card key={meal.id} className="p-4 lg:p-5">
                  <div className="flex items-center gap-3 mb-3 lg:mb-4">
                    <button
                      onClick={() => handleToggleMeal(meal)}
                      className={`w-5 h-5 lg:w-6 lg:h-6 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        allMealChecked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : mealCheckedCount > 0
                          ? 'bg-emerald-500/30 border-emerald-500/50'
                          : 'bg-transparent border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {allMealChecked && <Check size={14} strokeWidth={2.5} />}
                    </button>

                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <MealIcon
                        icon={meal.icon}
                        size={18}
                        className={allMealChecked ? 'text-zinc-600' : 'text-zinc-400'}
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className={`font-medium text-sm lg:text-base ${allMealChecked ? 'text-zinc-500 line-through' : ''}`}>
                        {meal.name}
                      </h3>
                      <p className="text-xs text-zinc-500">{meal.time}</p>
                    </div>
                    <span className="text-xs lg:text-sm text-zinc-500">
                      {mealCheckedCount}/{meal.items.length}
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
      </div>
    </div>
  );
}

function MacroBar({ label, current, total, unit, color = 'white' }: {
  label: string;
  current: number;
  total: number;
  unit: string;
  color?: 'white' | 'emerald' | 'blue' | 'orange';
}) {
  const percent = Math.min(100, (current / total) * 100);
  const bgColors = {
    white: 'bg-white',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-400">{label}</span>
        <span>{current} / {total} {unit}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgColors[color]} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
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
    <div className={`rounded-lg transition-colors ${checked ? 'bg-emerald-500/5' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
            checked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-transparent border-zinc-600 hover:border-zinc-500'
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
