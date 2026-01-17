'use client';

import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Plus, TrendingDown, Zap, Info, Download } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import InfoSheet from '@/components/InfoSheet';
import { useData } from '@/lib/data-store';
import { getItemTotals, getPlanTotals, DEFAULT_PLAN_A, DEFAULT_PLAN_B } from '@/lib/mealPlan';

// Calculate Exponentially Weighted Moving Average (EWMA) for weights
// Used by MacroFactor, Hacker's Diet, and scientific literature
// α = 0.1 means today has 10% weight, yesterday 9%, etc. (~20-day equivalent smoothing)
function getWeightTrend(weights: Array<{ date: string; weight: number }>, alpha: number = 0.1): { date: string; trend: number }[] {
  if (weights.length === 0) return [];

  // Sort by date to ensure correct order
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));

  const result: { date: string; trend: number }[] = [];
  let trend = sorted[0].weight; // Initialize with first weight

  for (const entry of sorted) {
    // EWMA formula: trend = α × weight + (1 - α) × previous_trend
    trend = alpha * entry.weight + (1 - alpha) * trend;
    result.push({ date: entry.date, trend: Math.round(trend * 100) / 100 });
  }

  return result;
}

// Calculate expected weight trajectory based on caloric deficit
// Uses average of days 7-14 as baseline (after initial water weight loss)
function getExpectedWeights(
  weights: Array<{ date: string; weight: number }>,
  startDate: string,
  dailyCalories: number = 1700,
  estimatedTdee: number = 2200
): { date: string; expected: number }[] {
  if (weights.length === 0) return [];

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const start = new Date(startDate);

  // Find weights from days 7-14 for baseline (after water weight period)
  const day7 = addDays(start, 7);
  const day14 = addDays(start, 14);
  const baselineWeights = sorted.filter(w => {
    const d = new Date(w.date);
    return d >= day7 && d <= day14;
  });

  // Use average of days 7-14 as baseline, or first available weight if not enough data
  let baselineWeight: number;
  let baselineDate: Date;

  if (baselineWeights.length >= 3) {
    baselineWeight = baselineWeights.reduce((sum, w) => sum + w.weight, 0) / baselineWeights.length;
    baselineDate = day7;
  } else {
    // Not enough data yet - use first weight
    baselineWeight = sorted[0].weight;
    baselineDate = new Date(sorted[0].date);
  }

  // Expected daily loss based on deficit (7700 kcal = 1 kg fat)
  const dailyDeficit = estimatedTdee - dailyCalories;
  const dailyLossKg = dailyDeficit / 7700;

  return sorted.map((entry) => {
    const daysFromBaseline = differenceInDays(new Date(entry.date), baselineDate);
    // Only show expected line from baseline onwards
    if (daysFromBaseline < 0) {
      return { date: entry.date, expected: entry.weight }; // Just show actual weight before baseline
    }
    const expectedWeight = baselineWeight - (daysFromBaseline * dailyLossKg);
    return { date: entry.date, expected: Math.round(expectedWeight * 10) / 10 };
  });
}

export default function WeightPage() {
  const { data, isLoading, addWeight, getChecklistItems, getDayPlanId, getDaySnapshot } = useData();
  const [showForm, setShowForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showChartInfo, setShowChartInfo] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // TDEE Calculation - must be before any early returns
  // Fixed: Now uses actual DATES instead of entry counts for accurate time periods
  const tdeeTracking = useMemo(() => {
    if (!data.profile) {
      return {
        daysElapsed: 0,
        calculatedTdee: null,
        tdeeConfidence: null,
        daysUntilTdee: 21,
        weightsNeeded: 10,
        weeklyTrend: null,
      };
    }

    const startDate = new Date(data.profile.startDate);
    const today = new Date();
    const daysElapsed = differenceInDays(today, startDate);

    // Sort weights by date
    const sortedWeights = [...data.weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Filter out first 7 days (water weight period)
    const startDatePlus7 = addDays(startDate, 7);
    const weightsAfterWaterPeriod = sortedWeights.filter(
      w => new Date(w.date) >= startDatePlus7
    );

    // Calculate weight trend using EWMA for more accurate weekly trend
    const trendData = getWeightTrend(weightsAfterWaterPeriod, 0.1);

    // Get trend values from actual DATE ranges (not entry counts!)
    const twoWeeksAgo = subDays(today, 14);
    const fourWeeksAgo = subDays(today, 28);

    // Find trend values closest to these dates
    const recentTrends = trendData.filter(t => new Date(t.date) >= twoWeeksAgo);
    const olderTrends = trendData.filter(t => {
      const d = new Date(t.date);
      return d >= fourWeeksAgo && d < twoWeeksAgo;
    });

    // Calculate average trend for each 2-week period
    const recentAvgTrend = recentTrends.length > 0
      ? recentTrends.reduce((sum, t) => sum + t.trend, 0) / recentTrends.length
      : null;

    const olderAvgTrend = olderTrends.length > 0
      ? olderTrends.reduce((sum, t) => sum + t.trend, 0) / olderTrends.length
      : null;

    // Weekly trend: weight lost per week (kg)
    // Based on actual 2-week comparison using trend values
    let weeklyTrend: number | null = null;
    if (recentAvgTrend !== null && olderAvgTrend !== null && recentTrends.length >= 5 && olderTrends.length >= 5) {
      const biWeeklyTrend = olderAvgTrend - recentAvgTrend; // Positive = losing weight
      weeklyTrend = biWeeklyTrend / 2;
    }

    let calculatedTdee: number | null = null;
    let tdeeConfidence: 'low' | 'medium' | 'high' | null = null;

    if (daysElapsed >= 21 && weightsAfterWaterPeriod.length >= 10 && weeklyTrend !== null && weeklyTrend > 0.1) {
      // Calculate calories consumed over the SAME date range as weight data
      // Use the last 28 days (matching our weight trend period)
      let totalCaloriesConsumed = 0;
      let daysWithData = 0;

      for (let i = 0; i < 28; i++) {
        const dateStr = format(subDays(today, i), 'yyyy-MM-dd');
        const dateObj = new Date(dateStr);

        // Skip if before day 7
        if (dateObj < startDatePlus7) continue;

        const dayPlanId = getDayPlanId(dateStr);
        const dayCheckedItems = getChecklistItems(dateStr, dayPlanId);
        const extraCals = data.extraCalories?.[dateStr] || 0;

        const daySnapshot = getDaySnapshot(dateStr, dayPlanId);
        const dayPlan = daySnapshot
          ? { meals: daySnapshot.meals }
          : (dayPlanId === DEFAULT_PLAN_A.id ? DEFAULT_PLAN_A : DEFAULT_PLAN_B);
        const dayOverrides = daySnapshot?.overrides || [];

        let dayCalories = extraCals;
        dayPlan.meals.forEach(meal => {
          meal.items.forEach(item => {
            if (dayCheckedItems.includes(item.id)) {
              const override = dayOverrides.find(o => o.itemId === item.id);
              const totals = getItemTotals(item, override?.quantity);
              dayCalories += totals.calories;
            }
          });
        });

        if (dayCheckedItems.length > 0 || extraCals > 0) {
          totalCaloriesConsumed += dayCalories;
          daysWithData++;
        }
      }

      if (daysWithData >= 10) {
        const avgDailyCalories = totalCaloriesConsumed / daysWithData;
        // TDEE = calories eaten + deficit (deficit = weight loss in energy terms)
        const dailyDeficitFromWeight = (weeklyTrend * 7700) / 7;
        calculatedTdee = Math.round(avgDailyCalories + dailyDeficitFromWeight);

        // Confidence based on data quality
        if (daysElapsed >= 35 && daysWithData >= 21 && weightsAfterWaterPeriod.length >= 21) {
          tdeeConfidence = 'high';
        } else if (daysElapsed >= 28 && daysWithData >= 14) {
          tdeeConfidence = 'medium';
        } else {
          tdeeConfidence = 'low';
        }
      }
    }

    const daysUntilTdee = Math.max(0, 21 - daysElapsed);
    const weightsNeeded = Math.max(0, 10 - weightsAfterWaterPeriod.length);

    return {
      daysElapsed,
      calculatedTdee,
      tdeeConfidence,
      daysUntilTdee,
      weightsNeeded,
      weeklyTrend,
    };
  }, [data.profile, data.weights, data.extraCalories, data.checklist, data.daySnapshots, data.dayPlanIds, getChecklistItems, getDayPlanId, getDaySnapshot]);

  const handleSubmit = () => {
    if (!newWeight) return;
    addWeight(selectedDate, parseFloat(newWeight));
    setNewWeight('');
    setShowForm(false);
  };

  const exportProgress = async (formatType: 'json' | 'table' | 'text') => {
    const exportSortedWeights = [...data.weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const exportTrendData = getWeightTrend(exportSortedWeights, 0.1);
    const latestWeight = exportSortedWeights[exportSortedWeights.length - 1]?.weight;
    const firstWeight = exportSortedWeights[0]?.weight;
    const totalLost = firstWeight && latestWeight ? firstWeight - latestWeight : 0;
    const remaining = latestWeight ? latestWeight - data.profile.goalWeight : 0;

    if (formatType === 'json') {
      const exportData = {
        profile: {
          startWeight: data.profile.startWeight,
          currentWeight: latestWeight || data.profile.currentWeight,
          goalWeight: data.profile.goalWeight,
          startDate: data.profile.startDate,
          calorieTarget: data.profile.calorieTarget,
          proteinTarget: data.profile.proteinTarget,
          tdee: tdeeTracking.calculatedTdee || data.profile.tdee,
          tdeeCalculated: !!tdeeTracking.calculatedTdee,
          tdeeConfidence: tdeeTracking.tdeeConfidence,
        },
        progress: {
          daysElapsed: tdeeTracking.daysElapsed,
          totalLost: Math.round(totalLost * 10) / 10,
          remaining: Math.round(remaining * 10) / 10,
          weeklyTrend: tdeeTracking.weeklyTrend ? Math.round(tdeeTracking.weeklyTrend * 100) / 100 : null,
        },
        weights: exportSortedWeights.map((w, i) => ({
          date: w.date,
          weight: w.weight,
          trend: exportTrendData[i]?.trend || null,
        })),
      };
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    } else if (formatType === 'table') {
      let table = 'Datum\tGewicht\tTrend (EWMA)\n';
      exportSortedWeights.forEach((w, i) => {
        table += `${w.date}\t${w.weight}\t${exportTrendData[i]?.trend || '-'}\n`;
      });
      table += '\n--- Zusammenfassung ---\n';
      table += `Startgewicht:\t${data.profile.startWeight} kg\n`;
      table += `Aktuell:\t${latestWeight || '-'} kg\n`;
      table += `Ziel:\t${data.profile.goalWeight} kg\n`;
      table += `Verloren:\t${totalLost.toFixed(1)} kg\n`;
      table += `Verbleibend:\t${remaining.toFixed(1)} kg\n`;
      table += `Tage:\t${tdeeTracking.daysElapsed}\n`;
      table += `TDEE:\t${tdeeTracking.calculatedTdee || data.profile.tdee} kcal\n`;
      if (tdeeTracking.weeklyTrend) {
        table += `Trend/Woche:\t-${tdeeTracking.weeklyTrend.toFixed(2)} kg\n`;
      }
      await navigator.clipboard.writeText(table);
    } else {
      let text = '📊 Fatloss Fortschritt\n\n';
      text += `Start: ${data.profile.startWeight} kg (${format(new Date(data.profile.startDate), 'd. MMM yyyy', { locale: de })})\n`;
      text += `Aktuell: ${latestWeight || '-'} kg\n`;
      text += `Ziel: ${data.profile.goalWeight} kg\n`;
      text += `Verloren: ${totalLost.toFixed(1)} kg\n`;
      text += `Verbleibend: ${remaining.toFixed(1)} kg\n\n`;
      text += `📅 Tag ${tdeeTracking.daysElapsed}\n`;
      text += `⚡ TDEE: ${tdeeTracking.calculatedTdee || data.profile.tdee} kcal`;
      if (tdeeTracking.calculatedTdee) {
        text += ` (${tdeeTracking.tdeeConfidence === 'high' ? 'hohe' : tdeeTracking.tdeeConfidence === 'medium' ? 'mittlere' : 'niedrige'} Konfidenz)`;
      }
      text += '\n';
      if (tdeeTracking.weeklyTrend) {
        text += `📉 Trend: -${tdeeTracking.weeklyTrend.toFixed(2)} kg/Woche\n`;
      }
      text += `🎯 Kalorien: ${data.profile.calorieTarget} kcal\n`;
      text += `💪 Protein: ${data.profile.proteinTarget}g\n\n`;
      text += `Letzte 7 Einträge:\n`;
      sortedWeights.slice(-7).forEach(w => {
        text += `• ${format(new Date(w.date), 'd.M.', { locale: de })}: ${w.weight} kg\n`;
      });
      await navigator.clipboard.writeText(text);
    }
    setShowExportMenu(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 lg:max-w-3xl animate-pulse space-y-4">
        <div className="h-8 bg-zinc-900 rounded w-1/2"></div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-900 rounded-xl"></div>)}
        </div>
        <div className="h-56 bg-zinc-900 rounded-xl"></div>
      </div>
    );
  }

  const weights = data.weights;
  const goalWeight = data.profile.goalWeight;

  // Use calculated TDEE if available, otherwise estimate based on typical deficit
  const estimatedTdee = tdeeTracking.calculatedTdee || 2200;
  const planATotals = getPlanTotals(DEFAULT_PLAN_A);
  const planBTotals = getPlanTotals(DEFAULT_PLAN_B);
  const avgDailyCalories = (planATotals.calories + planBTotals.calories) / 2;

  // Sort weights for consistent display
  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const trendData = getWeightTrend(sortedWeights, 0.1);
  const expectedWeights = getExpectedWeights(sortedWeights, data.profile.startDate, avgDailyCalories, estimatedTdee);

  // Create chart data with trend instead of simple average
  const chartData = sortedWeights.map((w, i) => ({
    date: format(new Date(w.date), 'd.M.', { locale: de }),
    weight: w.weight,
    trend: trendData[i]?.trend,
    expected: expectedWeights[i]?.expected,
  }));

  const latestWeight = weights[weights.length - 1]?.weight;
  const firstWeight = weights[0]?.weight;
  const totalChange = firstWeight && latestWeight ? firstWeight - latestWeight : 0;

  return (
    <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-zinc-500 text-sm">Verfolge deinen Fortschritt</p>
          <h1 className="text-xl font-semibold tracking-tight">Gewicht</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Exportieren"
            >
              <Download size={18} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-10 py-1 min-w-[140px]">
                {/* Apple HIG: 44pt min row height */}
                <button onClick={() => exportProgress('text')} className="w-full text-left px-4 min-h-[44px] text-[17px] hover:bg-zinc-700 flex items-center">Text</button>
                <button onClick={() => exportProgress('table')} className="w-full text-left px-4 min-h-[44px] text-[17px] hover:bg-zinc-700 flex items-center">Tabelle</button>
                <button onClick={() => exportProgress('json')} className="w-full text-left px-4 min-h-[44px] text-[17px] hover:bg-zinc-700 flex items-center">JSON</button>
              </div>
            )}
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus size={16} className="mr-1" /> Eintragen
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-4" glow>
          <div className="space-y-4">
            <Input
              label="Datum"
              type="date"
              value={selectedDate}
              onChange={setSelectedDate}
            />
            <Input
              label="Gewicht"
              type="number"
              inputMode="decimal"
              value={newWeight}
              onChange={setNewWeight}
              placeholder="85.5"
              suffix="kg"
              step={0.1}
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">Speichern</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary">Abbrechen</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3">
          <p className="text-xs text-zinc-500">Aktuell</p>
          <p className="text-lg font-semibold">{latestWeight || '--'} <span className="text-xs text-zinc-500">kg</span></p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-zinc-500">Ziel</p>
          <p className="text-lg font-semibold">{goalWeight || '--'} <span className="text-xs text-zinc-500">kg</span></p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-zinc-500">Verloren</p>
          <p className="text-lg font-semibold text-emerald-500">
            {totalChange > 0 ? `-${totalChange.toFixed(1)}` : '--'} <span className="text-xs">kg</span>
          </p>
        </Card>
      </div>

      {/* TDEE Card */}
      <Card className="mb-4 p-0 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" />
              <span className="text-sm font-medium">
                {tdeeTracking.calculatedTdee ? 'Berechneter TDEE' : 'TDEE Berechnung'}
              </span>
            </div>
            {tdeeTracking.tdeeConfidence && (
              <span className={`text-xs uppercase tracking-wider font-medium px-2 py-0.5 rounded ${
                tdeeTracking.tdeeConfidence === 'high' ? 'text-emerald-500 bg-emerald-500/10' :
                tdeeTracking.tdeeConfidence === 'medium' ? 'text-yellow-500 bg-yellow-500/10' : 'text-zinc-400 bg-zinc-800'
              }`}>
                {tdeeTracking.tdeeConfidence === 'high' ? 'Hoch' :
                 tdeeTracking.tdeeConfidence === 'medium' ? 'Mittel' : 'Niedrig'}
              </span>
            )}
          </div>
          {tdeeTracking.calculatedTdee ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-yellow-500">
                  {tdeeTracking.calculatedTdee}
                </span>
                <span className="text-sm text-yellow-500/70">kcal/Tag</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Basierend auf {tdeeTracking.daysElapsed} Tagen Tracking. Annahme war {data.profile.tdee} kcal.
              </p>
              {tdeeTracking.weeklyTrend && (
                <p className="text-xs text-zinc-600 mt-1">
                  Trend: −{tdeeTracking.weeklyTrend.toFixed(2)} kg/Woche
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-zinc-400 mb-3">
                {tdeeTracking.daysUntilTdee > 0
                  ? `Noch ${tdeeTracking.daysUntilTdee} Tage tracken`
                  : tdeeTracking.weightsNeeded > 0
                  ? `Noch ${tdeeTracking.weightsNeeded} Gewichtseinträge nötig`
                  : 'Noch mehr Kalorientracking nötig'}
              </p>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500/60 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((21 - tdeeTracking.daysUntilTdee) / 21) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Benötigt: 21+ Tage, 10+ Gewichtseinträge nach Woche 1
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Chart */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-400">Gewichtsverlauf</h3>
            <button
              onClick={() => setShowChartInfo(true)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Info zu den Linien"
            >
              <Info size={14} />
            </button>
          </div>
          {/* Legend */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="text-zinc-500">Aktuell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-500 rounded"></div>
              <span className="text-zinc-500">Trend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: 'repeating-linear-gradient(90deg, #22c55e 0, #22c55e 2px, transparent 2px, transparent 4px)' }}></div>
              <span className="text-zinc-500">Erwartet</span>
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-48 outline-none" tabIndex={-1}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(value, name) => {
                    if (value == null) return [];
                    const label = name === 'weight' ? 'Aktuell' : name === 'trend' ? 'Trend (EWMA)' : 'Erwartet';
                    return [`${value} kg`, label];
                  }}
                />
                {goalWeight && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="#a1a1aa"
                    strokeDasharray="5 5"
                    label={{ value: 'Ziel', fill: '#a1a1aa', fontSize: 10 }}
                  />
                )}
                {/* Expected line - dashed green, always goes down */}
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="expected"
                />
                {/* Trend line - solid amber, EWMA smoothed data */}
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="trend"
                />
                {/* Actual weight dots - rendered last to be on top */}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#ffffff"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  dot={{ fill: '#ffffff', r: 4, strokeWidth: 0 }}
                  activeDot={{ fill: '#ffffff', r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                  name="weight"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <TrendingDown size={32} className="mx-auto mb-2 opacity-50" />
              <p>Noch keine Daten. Trage dein erstes Gewicht ein!</p>
            </div>
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <h3 className="text-[15px] font-medium text-zinc-400 mb-3">Verlauf</h3>
        {/* Apple HIG: 44pt min row height */}
        <div className="space-y-0 max-h-64 overflow-y-auto no-scrollbar">
          {[...weights].reverse().slice(0, 10).map((entry, i) => (
            <div key={i} className="flex justify-between items-center min-h-[44px] py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-400 text-[15px]">
                {format(new Date(entry.date), 'd. MMMM yyyy', { locale: de })}
              </span>
              <span className="text-[17px] font-medium">{entry.weight} kg</span>
            </div>
          ))}
          {weights.length === 0 && (
            <p className="text-zinc-500 text-center py-4 text-[15px]">Noch keine Einträge</p>
          )}
        </div>
      </Card>

      {/* Chart Info Sheet */}
      <InfoSheet
        open={showChartInfo}
        onOpenChange={setShowChartInfo}
        title="Chart-Linien erklärt"
      >
        <div className="space-y-5">
          {/* Aktuell */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <span className="font-medium">Aktuell (Weiße Punkte)</span>
            </div>
            <p className="text-[15px] text-zinc-400">
              Dein tatsächlich gemessenes Gewicht an jedem Tag.
            </p>
          </div>

          {/* Trend */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-amber-500"></div>
              <span className="font-medium text-amber-500">Trend (Gelbe Linie)</span>
            </div>
            <p className="text-[15px] text-zinc-400 mb-2">
              Exponentiell gewichteter Durchschnitt (EWMA) - reagiert schneller auf echte Veränderungen als ein einfacher Durchschnitt.
            </p>
            <div className="bg-zinc-800 rounded-xl p-3 text-[13px] font-mono space-y-1">
              <div>Trend = 10% × Heute + 90% × Gestern</div>
              <div className="text-zinc-500">Heute: 10%, Gestern: 9%, Vorgestern: 8.1%...</div>
            </div>
            <p className="text-[13px] text-zinc-500 mt-2">
              Dips werden sofort reflektiert, aber Ausreißer (Bloating) verfallen schnell.
            </p>
          </div>

          {/* Erwartet */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-emerald-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #22c55e 0, #22c55e 4px, transparent 4px, transparent 8px)' }}></div>
              <span className="font-medium text-emerald-500">Erwartet (Grün gestrichelt)</span>
            </div>
            <p className="text-[15px] text-zinc-400 mb-2">
              Theoretischer Gewichtsverlust basierend auf deinem Kaloriendefizit. Startet ab Tag 7 (nach Wasserverlust).
            </p>
            <div className="bg-zinc-800 rounded-xl p-3 text-[13px] font-mono space-y-1">
              <div>Baseline = Ø Gewicht Tag 7-14</div>
              <div>Verlust/Tag = Defizit ÷ 7700 kcal</div>
              <div className="text-zinc-500">(7700 kcal = 1 kg Körperfett)</div>
            </div>
          </div>

          {/* TDEE */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-blue-400" />
              <span className="font-medium text-blue-400">TDEE Berechnung</span>
            </div>
            <p className="text-[15px] text-zinc-400 mb-2">
              Nach 21+ Tagen wird dein TDEE aus den letzten 28 Tagen berechnet (Kalorien + Trend-Gewichtsverlust):
            </p>
            <div className="bg-zinc-800 rounded-xl p-3 text-[13px] font-mono space-y-1">
              <div>TDEE = Ø Kalorien + Defizit</div>
              <div>Defizit = (Trend-Verlust/Woche × 7700) ÷ 7</div>
              <div className="text-zinc-500 mt-1">Nutzt EWMA-Trend für genaue Wochenwerte</div>
            </div>
            <p className="text-[13px] text-zinc-500 mt-2">
              Aktueller TDEE: {tdeeTracking.calculatedTdee || data.profile.tdee} kcal
              {tdeeTracking.calculatedTdee ? ' (berechnet)' : ' (manuell in Settings)'}
            </p>
          </div>
        </div>
      </InfoSheet>
    </div>
  );
}
