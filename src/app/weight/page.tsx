'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Plus, TrendingDown } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { getWeights, addWeight, getSettings, getMovingAverage, WeightEntry } from '@/lib/storage';

export default function WeightPage() {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setWeights(getWeights());
    const settings = getSettings();
    if (settings?.goalWeight) {
      setGoalWeight(settings.goalWeight);
    }
  };

  const handleSubmit = () => {
    if (!newWeight) return;
    addWeight({ date: selectedDate, weight: parseFloat(newWeight) });
    setNewWeight('');
    setShowForm(false);
    loadData();
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const movingAvg = getMovingAverage(weights);
  const chartData = weights.map((w, i) => ({
    date: format(new Date(w.date), 'd.M.'),
    weight: w.weight,
    avg: movingAvg[i]?.avg,
  }));

  const latestWeight = weights[weights.length - 1]?.weight;
  const firstWeight = weights[0]?.weight;
  const totalChange = firstWeight && latestWeight ? firstWeight - latestWeight : 0;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gewicht</h1>
          <p className="text-gray-400 text-sm">Verfolge deinen Fortschritt</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={18} className="mr-1" /> Eintragen
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
        <Card>
          <p className="text-xs text-gray-400">Aktuell</p>
          <p className="text-lg font-bold">{latestWeight || '--'} <span className="text-xs text-gray-400">kg</span></p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Ziel</p>
          <p className="text-lg font-bold">{goalWeight || '--'} <span className="text-xs text-gray-400">kg</span></p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Verloren</p>
          <p className="text-lg font-bold text-[#10b981]">
            {totalChange > 0 ? `-${totalChange.toFixed(1)}` : '--'}
          </p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Gewichtsverlauf</h3>
        {chartData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#2a2a3a' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a24',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => value != null ? [`${value} kg`, ''] : ['', '']}
                />
                {goalWeight && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="#8b5cf6"
                    strokeDasharray="5 5"
                    label={{ value: 'Ziel', fill: '#8b5cf6', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#6b7280"
                  strokeWidth={1}
                  dot={{ fill: '#6b7280', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="7-Tage Ø"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingDown size={32} className="mx-auto mb-2 opacity-50" />
              <p>Noch keine Daten. Trag dein erstes Gewicht ein!</p>
            </div>
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Verlauf</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {[...weights].reverse().slice(0, 10).map((entry, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-gray-400 text-sm">
                {format(new Date(entry.date), 'd. MMM yyyy', { locale: de })}
              </span>
              <span className="font-medium">{entry.weight} kg</span>
            </div>
          ))}
          {weights.length === 0 && (
            <p className="text-gray-500 text-center py-4">Noch keine Einträge</p>
          )}
        </div>
      </Card>
    </div>
  );
}
