'use client';

import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Plus, TrendingDown, Zap, Info, X, Download } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useData } from '@/lib/data-store';
import { getItemTotals, getPlanTotals, DEFAULT_PLAN_A, DEFAULT_PLAN_B } from '@/lib/mealPlan';

// Calculate 7-day moving average for weights
function getMovingAverage(weights: Array<{ date: string; weight: number }>, days: number = 7): { date: string; avg: number }[] {
  if (weights.length === 0) return [];

  return weights.map((entry, index) => {
    const start = Math.max(0, index - days + 1);
    const slice = weights.slice(start, index + 1);
    const avg = slice.reduce((sum, w) => sum + w.weight, 0) / slice.length;
    return { date: entry.date, avg: Math.round(avg * 10) / 10 };
  });
}

// Calculate expected weight trajectory based on caloric deficit
function getExpectedWeights(
  weights: Array<{ date: string; weight: number }>,
  dailyCalories: number = 1700,
  estimatedTdee: number = 2200
): { date: string; expected: number }[] {
  if (weights.length === 0) return [];

  const firstWeight = weights[0].weight;
  const firstDate = new Date(weights[0].date);

  // Expected daily loss based on deficit (7700 kcal = 1 kg fat)
  const dailyDeficit = estimatedTdee - dailyCalories;
  const dailyLossKg = dailyDeficit / 7700;

  return weights.map((entry) => {
    const daysFromStart = differenceInDays(new Date(entry.date), firstDate);
    const expectedWeight = firstWeight - (daysFromStart * dailyLossKg);
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

    // Use 14-day rolling averages
    const last14Weights = weightsAfterWaterPeriod.slice(-14);
    const prev14Weights = weightsAfterWaterPeriod.slice(-28, -14);

    const rollingAvgWeight = last14Weights.length > 0
      ? last14Weights.reduce((sum, w) => sum + w.weight, 0) / last14Weights.length
      : data.profile.currentWeight;

    const prevAvgWeight = prev14Weights.length > 0
      ? prev14Weights.reduce((sum, w) => sum + w.weight, 0) / prev14Weights.length
      : null;

    const biWeeklyTrend = prevAvgWeight !== null && last14Weights.length >= 7
      ? prevAvgWeight - rollingAvgWeight
      : null;

    const weeklyTrend = biWeeklyTrend !== null ? biWeeklyTrend / 2 : null;

    let calculatedTdee: number | null = null;
    let tdeeConfidence: 'low' | 'medium' | 'high' | null = null;

    if (daysElapsed >= 21 && weightsAfterWaterPeriod.length >= 10) {
      let totalCaloriesConsumed = 0;
      let daysWithData = 0;

      for (let i = 7; i < Math.min(daysElapsed, 35); i++) {
        const dateStr = format(subDays(today, daysElapsed - i), 'yyyy-MM-dd');
        // Get the plan that was selected for this day
        const dayPlanId = getDayPlanId(dateStr);
        const dayCheckedItems = getChecklistItems(dateStr, dayPlanId);
        const extraCals = data.extraCalories?.[dateStr] || 0;

        // Get the snapshot for this specific date and plan
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

      if (daysWithData >= 10 && weeklyTrend !== null && weeklyTrend > 0.1) {
        const avgDailyCalories = totalCaloriesConsumed / daysWithData;
        const dailyDeficitFromWeight = (weeklyTrend * 7700) / 7;
        calculatedTdee = Math.round(avgDailyCalories + dailyDeficitFromWeight);

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
  }, [data.profile, data.weights, data.extraCalories, getChecklistItems, getDayPlanId, getDaySnapshot]);

  const handleSubmit = () => {
    if (!newWeight) return;
    addWeight(selectedDate, parseFloat(newWeight));
    setNewWeight('');
    setShowForm(false);
  };

  const exportProgress = async (formatType: 'json' | 'table' | 'text') => {
    const sortedWeights = [...data.weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const movingAvg = getMovingAverage(sortedWeights);
    const latestWeight = sortedWeights[sortedWeights.length - 1]?.weight;
    const firstWeight = sortedWeights[0]?.weight;
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
        weights: sortedWeights.map((w, i) => ({
          date: w.date,
          weight: w.weight,
          trend: movingAvg[i]?.avg || null,
        })),
      };
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    } else if (formatType === 'table') {
      let table = 'Datum\tGewicht\tTrend\n';
      sortedWeights.forEach((w, i) => {
        table += `${w.date}\t${w.weight}\t${movingAvg[i]?.avg || '-'}\n`;
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

  const movingAvg = getMovingAverage(weights);
  const expectedWeights = getExpectedWeights(weights, avgDailyCalories, estimatedTdee);
  const chartData = weights.map((w, i) => ({
    date: format(new Date(w.date), 'd.M.', { locale: de }),
    weight: w.weight,
    avg: movingAvg[i]?.avg,
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
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
                <button onClick={() => exportProgress('text')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">Text</button>
                <button onClick={() => exportProgress('table')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">Tabelle</button>
                <button onClick={() => exportProgress('json')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">JSON</button>
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
        <div className="flex justify-between items-start mb-4">
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
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="text-zinc-500">Aktuell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-amber-500"></div>
              <span className="text-zinc-500">Trend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-emerald-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #22c55e 0, #22c55e 4px, transparent 4px, transparent 8px)' }}></div>
              <span className="text-zinc-500">Erwartet</span>
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-48">
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
                    const label = name === 'weight' ? 'Aktuell' : name === 'avg' ? 'Trend' : 'Erwartet';
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
                {/* Trend line - solid amber, smoothed actual data */}
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="avg"
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
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Verlauf</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {[...weights].reverse().slice(0, 10).map((entry, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-400 text-sm">
                {format(new Date(entry.date), 'd. MMMM yyyy', { locale: de })}
              </span>
              <span className="font-medium">{entry.weight} kg</span>
            </div>
          ))}
          {weights.length === 0 && (
            <p className="text-zinc-500 text-center py-4">Noch keine Einträge</p>
          )}
        </div>
      </Card>

      {/* Chart Info Modal */}
      {showChartInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setShowChartInfo(false)} />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowChartInfo(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-4">Chart-Linien erklärt</h2>

            <div className="space-y-5">
              {/* Aktuell */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                  <span className="font-medium">Aktuell (Weiße Punkte)</span>
                </div>
                <p className="text-sm text-zinc-400">
                  Dein tatsächlich gemessenes Gewicht an jedem Tag.
                </p>
              </div>

              {/* Trend */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-0.5 bg-amber-500"></div>
                  <span className="font-medium text-amber-500">Trend (Gelbe Linie)</span>
                </div>
                <p className="text-sm text-zinc-400 mb-2">
                  7-Tage gleitender Durchschnitt deines Gewichts. Glättet tägliche Schwankungen (Wasser, Verdauung) und zeigt die echte Richtung.
                </p>
                <div className="bg-zinc-800 rounded-lg p-3 text-xs font-mono">
                  Trend = Ø der letzten 7 Messungen
                </div>
              </div>

              {/* Erwartet */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-0.5 bg-emerald-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #22c55e 0, #22c55e 4px, transparent 4px, transparent 8px)' }}></div>
                  <span className="font-medium text-emerald-500">Erwartet (Grün gestrichelt)</span>
                </div>
                <p className="text-sm text-zinc-400 mb-2">
                  Theoretischer Gewichtsverlust basierend auf deinem Kaloriendefizit.
                </p>
                <div className="bg-zinc-800 rounded-lg p-3 text-xs font-mono space-y-1">
                  <div>Defizit = TDEE − Kalorienaufnahme</div>
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
                <p className="text-sm text-zinc-400 mb-2">
                  Nach 21+ Tagen Tracking wird dein echter TDEE automatisch berechnet:
                </p>
                <div className="bg-zinc-800 rounded-lg p-3 text-xs font-mono">
                  <div>TDEE = Ø Kalorien + (Gewichtsverlust × 1100)</div>
                  <div className="text-zinc-500 mt-1">Wobei: 1100 = 7700 ÷ 7 Tage</div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Aktueller TDEE: {tdeeTracking.calculatedTdee || data.profile.tdee} kcal
                  {tdeeTracking.calculatedTdee ? ' (berechnet)' : ' (manuell in Settings)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
