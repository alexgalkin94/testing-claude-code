'use client';

import { useState, useMemo } from 'react';
import { format, subDays, addDays, isToday, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, ChevronDown, Scale, Flame, TrendingDown, TrendingUp, ChevronRight, ChevronLeft, Sunrise, Sun, Sunset, Cookie, Cloud, CloudOff, Pencil, Target, Plus, MoreHorizontal, Download } from 'lucide-react';
import Card from '@/components/Card';
import { useData } from '@/lib/data-store';
import {
  MealPlan,
  MealItem,
  Meal,
  getItemTotals,
  getMealTotals,
  getPlanTotals,
  getEffectiveItem,
  ItemOverride,
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
  const {
    data,
    isLoading,
    isSyncing,
    lastSyncError,
    toggleChecklistItem,
    setChecklistItems,
    setExtraCalories,
    addWeight,
    getDayPlan,
    getDayPlanId,
    setDayPlanId,
    getDayOverrides,
    setDayOverride,
    ensureDaySnapshot,
  } = useData();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showExtraInput, setShowExtraInput] = useState(false);
  const [extraInput, setExtraInput] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get plan for selected date (uses snapshot if available, else current plan)
  const plan = getDayPlan(selectedDateStr);
  const selectedPlanId = getDayPlanId(selectedDateStr);
  const dayOverrides = getDayOverrides(selectedDateStr);

  // Get extra calories for selected date
  const extraCalories = data.extraCalories?.[selectedDateStr] || 0;

  // Get checked items for selected date
  const checkedItems = useMemo(() => {
    return new Set(data.checklist[selectedDateStr] || []);
  }, [data.checklist, selectedDateStr]);

  const handleToggle = (itemId: string) => {
    // Ensure snapshot exists when tracking starts
    ensureDaySnapshot(selectedDateStr);
    toggleChecklistItem(selectedDateStr, itemId);
  };

  const handleToggleMeal = (meal: Meal) => {
    // Ensure snapshot exists when tracking starts
    ensureDaySnapshot(selectedDateStr);
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

  const handlePlanChange = (planId: string) => {
    setDayPlanId(selectedDateStr, planId);
  };

  const handleOverrideQuantity = (itemId: string) => {
    const qty = parseFloat(editingQuantity);
    if (!isNaN(qty) && qty >= 0) {
      setDayOverride(selectedDateStr, itemId, { quantity: qty });
    }
    setEditingItemId(null);
    setEditingQuantity('');
  };

  // Get override for an item
  const getOverrideForItem = (itemId: string): ItemOverride | undefined => {
    return dayOverrides.find(o => o.itemId === itemId);
  };

  const handleSelectAlternative = (itemId: string, alternativeId: string | undefined) => {
    setDayOverride(selectedDateStr, itemId, { alternativeId });
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
    addWeight(selectedDateStr, weight);
    setShowWeightInput(false);
    setWeightInput('');
  };

  const handleExtraCalories = () => {
    const extra = parseInt(extraInput);
    if (isNaN(extra)) return;
    setExtraCalories(selectedDateStr, extra);
    setShowExtraInput(false);
    setExtraInput('');
  };

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => { if (!isToday(selectedDate)) setSelectedDate(prev => addDays(prev, 1)); };
  const goToToday = () => setSelectedDate(new Date());

  const [showDayExportMenu, setShowDayExportMenu] = useState(false);

  const exportDay = async (formatType: 'json' | 'table' | 'text') => {
    if (!plan) return;
    const dateFormatted = format(selectedDate, 'd. MMMM yyyy', { locale: de });

    if (formatType === 'json') {
      const exportData = {
        date: selectedDateStr,
        plan: plan.name,
        meals: plan.meals.map(meal => ({
          name: meal.name,
          time: meal.time,
          items: meal.items.map(item => {
            const override = dayOverrides.find(o => o.itemId === item.id);
            const effectiveItem = getEffectiveItem(item, override?.alternativeId);
            const qty = override?.quantity ?? effectiveItem.quantity;
            const totals = getItemTotals(effectiveItem, qty);
            const isChecked = checkedItems.has(item.id);
            return {
              name: effectiveItem.name,
              quantity: qty,
              unit: effectiveItem.unit,
              checked: isChecked,
              ...totals,
            };
          }),
        })),
        consumed,
        extraCalories,
      };
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    } else if (formatType === 'table') {
      let output = `# ${dateFormatted} - ${plan.name}\n\n`;
      output += `| Mahlzeit | Item | Menge | kcal | Protein | Carbs | Fett | Gegessen |\n`;
      output += `|----------|------|-------|------|---------|-------|------|----------|\n`;
      for (const meal of plan.meals) {
        for (const item of meal.items) {
          const override = dayOverrides.find(o => o.itemId === item.id);
          const effectiveItem = getEffectiveItem(item, override?.alternativeId);
          const qty = override?.quantity ?? effectiveItem.quantity;
          const totals = getItemTotals(effectiveItem, qty);
          const isChecked = checkedItems.has(item.id);
          output += `| ${meal.name} | ${effectiveItem.name} | ${qty}${effectiveItem.unit} | ${totals.calories} | ${totals.protein}g | ${totals.carbs}g | ${totals.fat}g | ${isChecked ? '✓' : ''} |\n`;
        }
      }
      output += `\n**Gegessen:** ${consumed.calories} kcal, ${consumed.protein}g P, ${consumed.carbs}g C, ${consumed.fat}g F`;
      if (extraCalories) output += `\n**Extra:** ${extraCalories} kcal`;
      await navigator.clipboard.writeText(output);
    } else {
      let output = `${dateFormatted}\n${'='.repeat(dateFormatted.length)}\nPlan: ${plan.name}\n\n`;
      for (const meal of plan.meals) {
        output += `${meal.name} (${meal.time}):\n`;
        for (const item of meal.items) {
          const override = dayOverrides.find(o => o.itemId === item.id);
          const effectiveItem = getEffectiveItem(item, override?.alternativeId);
          const qty = override?.quantity ?? effectiveItem.quantity;
          const totals = getItemTotals(effectiveItem, qty);
          const isChecked = checkedItems.has(item.id);
          output += `  ${isChecked ? '[x]' : '[ ]'} ${qty}${effectiveItem.unit} ${effectiveItem.name} (${totals.calories} kcal, ${totals.protein}g P)\n`;
        }
        output += '\n';
      }
      output += `Gegessen: ${consumed.calories} kcal, ${consumed.protein}g P, ${consumed.carbs}g C, ${consumed.fat}g F`;
      if (extraCalories) output += `\nExtra: ${extraCalories} kcal`;
      await navigator.clipboard.writeText(output);
    }
    setShowDayExportMenu(false);
  };

  // Calculate streak
  const streak = useMemo(() => {
    if (!plan) return 0;
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
  }, [data.checklist, plan]);

  const completedCount = checkedItems.size;
  const totalItems = plan?.meals.reduce((sum, meal) => sum + meal.items.length, 0) || 0;
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  // Get weight for selected date (or nearest previous weight)
  const selectedDateWeight = useMemo(() => {
    const exactMatch = data.weights.find(w => w.date === selectedDateStr);
    if (exactMatch) return exactMatch.weight;

    // Find the most recent weight before or on selected date
    const weightsBeforeDate = data.weights
      .filter(w => w.date <= selectedDateStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    return weightsBeforeDate[0]?.weight || data.profile.startWeight;
  }, [data.weights, selectedDateStr, data.profile.startWeight]);

  const totalLoss = data.profile.startWeight - data.profile.currentWeight;
  const remaining = data.profile.currentWeight - data.profile.goalWeight;

  // Calculate consumed macros using new structure with overrides
  const consumed = useMemo(() => {
    if (!plan) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const result = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        if (checkedItems.has(item.id)) {
          const override = dayOverrides.find(o => o.itemId === item.id);
          const effectiveItem = getEffectiveItem(item, override?.alternativeId);
          const totals = getItemTotals(effectiveItem, override?.quantity);
          result.calories += totals.calories;
          result.protein += totals.protein;
          result.carbs += totals.carbs;
          result.fat += totals.fat;
        }
      });
    });
    return {
      calories: Math.round(result.calories),
      protein: Math.round(result.protein * 10) / 10,
      carbs: Math.round(result.carbs * 10) / 10,
      fat: Math.round(result.fat * 10) / 10,
    };
  }, [plan, checkedItems, dayOverrides]);

  // Calculate plan totals (all items, for display)
  const planTotals = useMemo(() => {
    if (!plan) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return getPlanTotals(plan, dayOverrides);
  }, [plan, dayOverrides]);

  // Total calories including extras
  const totalConsumedCalories = consumed.calories + extraCalories;

  // Smart progress tracking with rolling averages and adaptive TDEE
  const progressTracking = useMemo(() => {
    const startDate = new Date(data.profile.startDate);
    const today = new Date();
    const daysElapsed = differenceInDays(today, startDate);

    // Sort weights by date
    const sortedWeights = [...data.weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Filter out first 7 days (water weight period) for trend calculations
    const startDatePlus7 = addDays(startDate, 7);
    const weightsAfterWaterPeriod = sortedWeights.filter(
      w => new Date(w.date) >= startDatePlus7
    );

    // Use 14-day rolling averages for more stability
    const last14Weights = weightsAfterWaterPeriod.slice(-14);
    const prev14Weights = weightsAfterWaterPeriod.slice(-28, -14);

    // Current rolling average (last 14 days, excluding water weight period)
    const rollingAvgWeight = last14Weights.length > 0
      ? last14Weights.reduce((sum, w) => sum + w.weight, 0) / last14Weights.length
      : data.profile.currentWeight;

    // Previous period average for trend
    const prevAvgWeight = prev14Weights.length > 0
      ? prev14Weights.reduce((sum, w) => sum + w.weight, 0) / prev14Weights.length
      : null;

    // Bi-weekly trend (more stable than weekly)
    const biWeeklyTrend = prevAvgWeight !== null && last14Weights.length >= 7
      ? prevAvgWeight - rollingAvgWeight
      : null;

    // Convert to weekly rate
    const weeklyTrend = biWeeklyTrend !== null ? biWeeklyTrend / 2 : null;

    const totalToLose = data.profile.startWeight - data.profile.goalWeight;
    const actualLoss = data.profile.startWeight - rollingAvgWeight;

    // Calculate expected loss rate from calorie deficit
    const dailyDeficit = data.profile.tdee - data.profile.calorieTarget;
    const expectedLossPerDay = dailyDeficit / 7700;
    const expectedLossPerWeek = expectedLossPerDay * 7;

    // Expected weight - straight calculation from start
    const expectedLoss = daysElapsed * expectedLossPerDay;
    const expectedWeight = data.profile.startWeight - expectedLoss;

    // Difference: positive = ahead (actual lighter than expected), negative = behind
    const difference = expectedWeight - rollingAvgWeight;
    const isAhead = difference > 0;

    // Actual rate - prefer trend-based if available
    const actualRatePerWeek = weeklyTrend !== null
      ? weeklyTrend
      : (daysElapsed > 0 ? (actualLoss / daysElapsed) * 7 : 0);

    // Projected completion
    const remainingToLose = rollingAvgWeight - data.profile.goalWeight;
    const actualRatePerDay = actualRatePerWeek / 7;
    const projectedDaysRemaining = actualRatePerDay > 0 ? remainingToLose / actualRatePerDay : Infinity;
    const projectedDate = actualRatePerDay > 0 && projectedDaysRemaining < 365
      ? addDays(today, Math.ceil(projectedDaysRemaining))
      : null;

    return {
      daysElapsed,
      expectedWeight,
      difference: Math.abs(difference),
      isAhead,
      actualRatePerWeek,
      expectedLossPerWeek,
      projectedDate,
      remainingToLose,
      rollingAvgWeight,
    };
  }, [data.profile, data.weights]);

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

            <div className="flex items-center gap-1">
              <button
                onClick={goToNextDay}
                disabled={isViewingToday}
                className={`p-2 rounded-lg transition-colors ${isViewingToday ? 'opacity-30' : 'hover:bg-zinc-800'}`}
              >
                <ChevronRight size={20} className="text-zinc-400" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDayExportMenu(!showDayExportMenu)}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Download size={18} className="text-zinc-400" />
                </button>
                {showDayExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
                    <button onClick={() => exportDay('text')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">Text</button>
                    <button onClick={() => exportDay('table')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">Tabelle</button>
                    <button onClick={() => exportDay('json')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">JSON</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <>
            {/* Mobile Stats Row - Elegant minimal design */}
            <div className="mb-6 lg:hidden">
              <Card className="p-0 overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-zinc-800/50">
                  {/* Weight */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Gewicht</span>
                      {!showWeightInput && (
                        <button
                          onClick={() => setShowWeightInput(true)}
                          className="p-1 -m-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>
                    {showWeightInput ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={weightInput}
                          onChange={(e) => setWeightInput(e.target.value)}
                          placeholder={selectedDateWeight.toString()}
                          className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2 py-1.5 text-sm font-medium"
                          step="0.1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickWeight();
                            if (e.key === 'Escape') { setShowWeightInput(false); setWeightInput(''); }
                          }}
                          onBlur={() => { if (!weightInput) { setShowWeightInput(false); } }}
                        />
                        <button
                          onClick={handleQuickWeight}
                          className="w-full bg-white text-black py-1 rounded-md text-xs font-semibold"
                        >
                          Speichern
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xl font-semibold tracking-tight">{selectedDateWeight}</span>
                        <span className="text-sm text-zinc-500 ml-1">kg</span>
                      </div>
                    )}
                  </div>
                    {/* Lost */}
                    <div className="p-4">
                      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium block mb-2">Verloren</span>
                      <div>
                        <span className={`text-xl font-semibold tracking-tight ${totalLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {totalLoss >= 0 ? '−' : '+'}{Math.abs(totalLoss).toFixed(1)}
                        </span>
                        <span className={`text-sm ml-1 ${totalLoss >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>kg</span>
                      </div>
                    </div>
                    {/* vs Plan */}
                    <div className="p-4">
                      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium block mb-2">vs. Plan</span>
                      <div>
                        <span className={`text-xl font-semibold tracking-tight ${progressTracking.isAhead ? 'text-emerald-400' : 'text-red-400'}`}>
                          {progressTracking.difference.toFixed(1)}
                        </span>
                        <span className={`text-sm ml-1 ${progressTracking.isAhead ? 'text-emerald-400/70' : 'text-red-400/70'}`}>kg {progressTracking.isAhead ? '↓' : '↑'}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Desktop Stats Cards */}
              <div className="hidden lg:block space-y-4 mt-6">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-400 mb-1">
                        Gewicht {isViewingToday ? '' : `am ${format(selectedDate, 'd.M.', { locale: de })}`}
                      </p>
                      {showWeightInput ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={weightInput}
                            onChange={(e) => setWeightInput(e.target.value)}
                            placeholder={selectedDateWeight.toString()}
                            className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xl font-semibold"
                            step="0.1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuickWeight();
                              if (e.key === 'Escape') { setShowWeightInput(false); setWeightInput(''); }
                            }}
                          />
                          <span className="text-zinc-500">kg</span>
                          <button
                            onClick={handleQuickWeight}
                            className="bg-white text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => { setShowWeightInput(false); setWeightInput(''); }}
                            className="text-zinc-500 hover:text-zinc-300 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <p className="text-3xl font-semibold">{selectedDateWeight} <span className="text-lg text-zinc-500">kg</span></p>
                      )}
                    </div>
                    {!showWeightInput && (
                      <button
                        onClick={() => setShowWeightInput(true)}
                        className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                      >
                        <Pencil size={20} className="text-zinc-400" />
                      </button>
                    )}
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown size={18} className="text-emerald-500" />
                      <span className="text-sm text-zinc-400">Verloren</span>
                    </div>
                    <p className={`text-2xl font-semibold ${totalLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {totalLoss >= 0 ? '-' : '+'}{Math.abs(totalLoss).toFixed(1)} kg
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {progressTracking.isAhead ? (
                        <TrendingUp size={18} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={18} className="text-red-500" />
                      )}
                      <span className="text-sm text-zinc-400">vs. Plan</span>
                    </div>
                    <p className={`text-2xl font-semibold ${progressTracking.isAhead ? 'text-emerald-500' : 'text-red-500'}`}>
                      {progressTracking.difference.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {progressTracking.isAhead ? 'unter Soll' : 'über Soll'}
                    </p>
                  </Card>
                </div>

                {/* Projected Completion */}
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={16} className="text-zinc-400" />
                        <span className="text-sm text-zinc-400">Ziel erreicht</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {progressTracking.projectedDate
                          ? format(progressTracking.projectedDate, 'd. MMM yyyy', { locale: de })
                          : '–'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 mb-1">Tempo</p>
                      <p className={`text-sm font-medium ${progressTracking.actualRatePerWeek >= progressTracking.expectedLossPerWeek ? 'text-emerald-500' : 'text-red-500'}`}>
                        {progressTracking.actualRatePerWeek.toFixed(2)} kg/Wo
                      </p>
                      <p className="text-xs text-zinc-600">
                        Soll: {progressTracking.expectedLossPerWeek.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Progress to Goal */}
                <Card className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-zinc-400">Fortschritt zum Ziel</span>
                    <span className="text-sm font-medium">{data.profile.goalWeight} kg</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, (totalLoss / (data.profile.startWeight - data.profile.goalWeight)) * 100))}%` }}
                    />
                  </div>
                  <p className="text-sm text-zinc-500">Noch {remaining.toFixed(1)} kg</p>
                </Card>

              </div>

              {/* Mobile Progress Card - Refined elegant design */}
              <Card className="mb-6 p-0 lg:hidden overflow-hidden">
                {/* Progress to goal */}
                <div className="p-4 pb-3">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Noch zum Ziel</span>
                      <div className="mt-1">
                        <span className="text-2xl font-semibold tracking-tight">{remaining.toFixed(1)}</span>
                        <span className="text-sm text-zinc-500 ml-1">kg</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">Ziel</span>
                      <p className="text-sm text-zinc-400 mt-1">{data.profile.goalWeight} kg</p>
                    </div>
                  </div>
                  <div className="h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-zinc-400 to-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, (totalLoss / (data.profile.startWeight - data.profile.goalWeight)) * 100))}%` }}
                    />
                  </div>
                </div>
                {/* Stats footer */}
                <div className="border-t border-zinc-800/50 px-4 py-3 flex justify-between items-center bg-zinc-900/30">
                  <div className="flex items-center gap-2">
                    <Target size={13} className="text-zinc-600" />
                    <span className="text-sm text-zinc-400">
                      {progressTracking.projectedDate
                        ? format(progressTracking.projectedDate, 'd. MMMM', { locale: de })
                        : '–'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${progressTracking.actualRatePerWeek >= progressTracking.expectedLossPerWeek ? 'text-emerald-400' : 'text-red-400'}`}>
                      {progressTracking.actualRatePerWeek.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-600 ml-1">/ {progressTracking.expectedLossPerWeek.toFixed(2)} kg/Wo</span>
                  </div>
                </div>
              </Card>

          </>

          {/* Plan Toggle - Desktop Only */}
          <div className="hidden lg:block">
            <Card className="p-4">
              <p className="text-sm text-zinc-400 mb-3">Ernährungsplan</p>
              <div className="flex flex-col gap-2">
                {Object.values(data.mealPlans).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePlanChange(p.id)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all text-left ${
                      selectedPlanId === p.id
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
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
                <MacroBar label="Kalorien" current={totalConsumedCalories} total={planTotals.calories} unit="kcal" extra={extraCalories} />
                <MacroBar label="Protein" current={consumed.protein} total={planTotals.protein} unit="g" color="emerald" />
                <MacroBar label="Carbs" current={consumed.carbs} total={planTotals.carbs} unit="g" color="blue" />
                <MacroBar label="Fett" current={consumed.fat} total={planTotals.fat} unit="g" color="orange" />
              </div>
              {/* Extra Calories Input */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Extra Kalorien</span>
                  {showExtraInput ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={extraInput}
                        onChange={(e) => setExtraInput(e.target.value)}
                        placeholder="0"
                        className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-right"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleExtraCalories();
                          if (e.key === 'Escape') { setShowExtraInput(false); setExtraInput(''); }
                        }}
                      />
                      <span className="text-zinc-500 text-sm">kcal</span>
                      <button
                        onClick={handleExtraCalories}
                        className="bg-white text-black px-3 py-1.5 rounded-lg text-sm font-medium"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowExtraInput(true); setExtraInput(extraCalories > 0 ? extraCalories.toString() : ''); }}
                      className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      {extraCalories > 0 ? (
                        <span className="text-orange-500 font-medium">+{extraCalories} kcal</span>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Hinzufügen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column - Meals */}
        <div className="lg:col-span-8">
          {/* Plan Toggle - Mobile */}
          <div className="flex gap-2 mb-4 lg:hidden overflow-x-auto pb-1">
            {Object.values(data.mealPlans).map((p) => (
              <button
                key={p.id}
                onClick={() => handlePlanChange(p.id)}
                className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  selectedPlanId === p.id
                    ? 'bg-white text-black'
                    : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Macros Summary - Mobile - Elegant design */}
          <Card className="mb-4 p-0 lg:hidden overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800/50">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                Makros {isViewingToday ? 'heute' : format(selectedDate, 'd.M.', { locale: de })}
              </span>
              <span className="text-xs text-zinc-600">{completedCount} / {totalItems}</span>
            </div>
            {/* Macros grid */}
            <div className="grid grid-cols-4 divide-x divide-zinc-800/50">
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">kcal</span>
                <p className="text-lg font-semibold tracking-tight mt-1">{totalConsumedCalories}</p>
                <p className="text-[10px] text-zinc-600">von {planTotals.calories}</p>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-emerald-500/70 font-medium">Protein</span>
                <p className="text-lg font-semibold tracking-tight mt-1">{consumed.protein}<span className="text-xs text-zinc-500">g</span></p>
                <p className="text-[10px] text-zinc-600">von {planTotals.protein}g</p>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-blue-400/70 font-medium">Carbs</span>
                <p className="text-lg font-semibold tracking-tight mt-1">{consumed.carbs}<span className="text-xs text-zinc-500">g</span></p>
                <p className="text-[10px] text-zinc-600">von {planTotals.carbs}g</p>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-orange-400/70 font-medium">Fett</span>
                <p className="text-lg font-semibold tracking-tight mt-1">{consumed.fat}<span className="text-xs text-zinc-500">g</span></p>
                <p className="text-[10px] text-zinc-600">von {planTotals.fat}g</p>
              </div>
            </div>
            {/* Extra Calories - elegant footer */}
            <div className="border-t border-zinc-800/50 px-4 py-3 bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">Extra</span>
                {showExtraInput ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={extraInput}
                      onChange={(e) => setExtraInput(e.target.value)}
                      placeholder="0"
                      className="w-20 bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2 py-1 text-sm text-right font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleExtraCalories();
                        if (e.key === 'Escape') { setShowExtraInput(false); setExtraInput(''); }
                      }}
                    />
                    <span className="text-xs text-zinc-500">kcal</span>
                    <button
                      onClick={handleExtraCalories}
                      className="bg-white text-black px-3 py-1 rounded-md text-xs font-semibold"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowExtraInput(true); setExtraInput(extraCalories.toString()); }}
                    className="flex items-center gap-2 text-sm transition-colors"
                  >
                    {extraCalories > 0 ? (
                      <span className="text-orange-400 font-medium">+{extraCalories} kcal</span>
                    ) : (
                      <span className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                        <Plus size={14} />
                        <span className="text-xs">Hinzufügen</span>
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
            {/* Progress indicator */}
            <div className="h-0.5 bg-zinc-800/50">
              <div
                className="h-full bg-emerald-500/80 transition-all duration-500"
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
            {plan?.meals.map(meal => {
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
                    {meal.items.map(item => {
                      const override = getOverrideForItem(item.id);
                      return (
                        <MealItemRow
                          key={item.id}
                          item={item}
                          checked={checkedItems.has(item.id)}
                          expanded={expandedItems.has(item.id)}
                          onToggle={() => handleToggle(item.id)}
                          onExpand={() => toggleExpanded(item.id)}
                          override={override}
                          onOverrideClick={() => {
                            if (editingItemId === item.id) {
                              setEditingItemId(null);
                              setEditingQuantity('');
                            } else {
                              setEditingItemId(item.id);
                              const effectiveItem = getEffectiveItem(item, override?.alternativeId);
                              setEditingQuantity(override?.quantity?.toString() || effectiveItem.quantity.toString());
                            }
                          }}
                          onSelectAlternative={(altId) => handleSelectAlternative(item.id, altId)}
                          isEditing={editingItemId === item.id}
                          editingValue={editingQuantity}
                          onEditingChange={setEditingQuantity}
                          onEditingSave={() => handleOverrideQuantity(item.id)}
                        />
                      );
                    })}
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

function MacroBar({ label, current, total, unit, color = 'white', extra = 0 }: {
  label: string;
  current: number;
  total: number;
  unit: string;
  color?: 'white' | 'emerald' | 'blue' | 'orange';
  extra?: number;
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
        <span>
          {current}
          {extra > 0 && <span className="text-orange-500 text-xs ml-1">(+{extra})</span>}
          {' '}/ {total} {unit}
        </span>
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
  override,
  onOverrideClick,
  onSelectAlternative,
  isEditing,
  editingValue,
  onEditingChange,
  onEditingSave,
}: {
  item: MealItem;
  checked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  override?: ItemOverride;
  onOverrideClick?: () => void;
  onSelectAlternative?: (alternativeId: string | undefined) => void;
  isEditing?: boolean;
  editingValue?: string;
  onEditingChange?: (value: string) => void;
  onEditingSave?: () => void;
}) {
  const hasAlternatives = item.alternatives && item.alternatives.length > 0;
  const effectiveItem = getEffectiveItem(item, override?.alternativeId);
  const effectiveQuantity = override?.quantity ?? effectiveItem.quantity;
  const totals = getItemTotals(effectiveItem, effectiveQuantity);
  const hasQuantityOverride = override?.quantity !== undefined && override.quantity !== effectiveItem.quantity;
  const hasAlternativeSelected = override?.alternativeId !== undefined;

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
            {hasAlternatives ? (
              <>
                <span className={`text-sm ${checked ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                  {item.groupName || 'Optionen'}
                </span>
                <span className="text-xs text-zinc-500">
                  → {effectiveQuantity !== 1 && `${effectiveQuantity}${effectiveItem.unit === 'g' || effectiveItem.unit === 'ml' ? `${effectiveItem.unit} ` : '× '}`}{effectiveItem.name}
                </span>
              </>
            ) : (
              <span className={`text-sm ${checked ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                {effectiveQuantity !== 1 && `${effectiveQuantity}${effectiveItem.unit === 'g' || effectiveItem.unit === 'ml' ? `${effectiveItem.unit} ` : '× '}`}{effectiveItem.name}
              </span>
            )}
            {hasQuantityOverride && <span className="text-orange-400 ml-1 text-xs">(angepasst)</span>}
            {hasAlternatives && (
              <button onClick={onExpand} className="text-zinc-600 hover:text-zinc-400">
                <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="flex gap-3 mt-1 text-xs text-zinc-500">
            <span>{totals.calories} kcal</span>
            <span>{totals.protein}g P</span>
          </div>
        </div>

        {/* Override button - subtle */}
        {onOverrideClick && (
          <button
            onClick={onOverrideClick}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Menge anpassen"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>

      {/* Override input */}
      {isEditing && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center gap-2 pl-8">
            <span className="text-xs text-zinc-500">Menge heute:</span>
            <input
              type="number"
              inputMode="decimal"
              value={editingValue}
              onChange={(e) => onEditingChange?.(e.target.value)}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
              placeholder={effectiveItem.quantity.toString()}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditingSave?.();
                if (e.key === 'Escape') onOverrideClick?.();
              }}
            />
            <span className="text-xs text-zinc-500">{effectiveItem.unit}</span>
            <button
              onClick={onEditingSave}
              className="bg-white text-black px-2 py-1 rounded text-xs font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Alternatives selection */}
      {hasAlternatives && expanded && !isEditing && (
        <div className="px-3 pb-3">
          <div className="pl-8 space-y-1">
            <button
              onClick={() => onSelectAlternative?.(undefined)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                !hasAlternativeSelected
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-700/50'
              }`}
            >
              <div className={`w-3 h-3 rounded-full border ${!hasAlternativeSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
              {item.quantity}{item.unit === 'g' || item.unit === 'ml' ? `${item.unit} ` : '× '}{item.name}
            </button>
            {item.alternatives!.map((alt) => {
              const isSelected = override?.alternativeId === alt.id;
              const altTotals = getItemTotals(alt);
              return (
                <button
                  key={alt.id}
                  onClick={() => onSelectAlternative?.(alt.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-zinc-400 hover:bg-zinc-700/50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'}`} />
                  <span className="flex-1">
                    {alt.quantity}{alt.unit === 'g' || alt.unit === 'ml' ? `${alt.unit} ` : '× '}{alt.name}
                  </span>
                  <span className="text-zinc-600">{altTotals.calories} kcal</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
