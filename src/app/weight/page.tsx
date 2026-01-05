'use client';

import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Plus, TrendingDown, Zap } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useData } from '@/lib/data-store';
import { DAY_A, DAY_B } from '@/lib/mealPlan';

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

export default function WeightPage() {
  const { data, isLoading, addWeight } = useData();
  const [showForm, setShowForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleSubmit = () => {
    if (!newWeight) return;
    addWeight(selectedDate, parseFloat(newWeight));
    setNewWeight('');
    setShowForm(false);
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
  const plan = data.dayType === 'A' ? DAY_A : DAY_B;

  // TDEE Calculation
  const tdeeTracking = useMemo(() => {
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
        const dayCheckedItems = data.checklist[dateStr] || [];
        const extraCals = data.extraCalories?.[dateStr] || 0;

        let dayCalories = extraCals;
        plan.meals.forEach(meal => {
          meal.items.forEach(item => {
            if (dayCheckedItems.includes(item.id)) {
              dayCalories += item.calories;
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
  }, [data.profile, data.weights, data.checklist, data.extraCalories, plan.meals]);

  const movingAvg = getMovingAverage(weights);
  const chartData = weights.map((w, i) => ({
    date: format(new Date(w.date), 'd.M.', { locale: de }),
    weight: w.weight,
    avg: movingAvg[i]?.avg,
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
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} className="mr-1" /> Eintragen
        </Button>
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
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Gewichtsverlauf</h3>
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
                  formatter={(value) => value != null ? [`${value} kg`, ''] : []}
                />
                {goalWeight && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="#a1a1aa"
                    strokeDasharray="5 5"
                    label={{ value: 'Ziel', fill: '#a1a1aa', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#52525b"
                  strokeWidth={1}
                  dot={{ fill: '#52525b', r: 3 }}
                  name="Gewicht"
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="7-Tage Ø"
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
    </div>
  );
}
