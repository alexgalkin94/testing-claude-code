'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Ruler } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { getMeasurements, addMeasurement, Measurement } from '@/lib/storage';

const MEASUREMENT_TYPES = [
  { key: 'waist', label: 'Waist', color: '#8b5cf6' },
  { key: 'chest', label: 'Chest', color: '#10b981' },
  { key: 'arms', label: 'Arms', color: '#f59e0b' },
  { key: 'thighs', label: 'Thighs', color: '#ef4444' },
  { key: 'hips', label: 'Hips', color: '#06b6d4' },
] as const;

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedType, setSelectedType] = useState<string>('waist');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setMeasurements(getMeasurements());
  };

  const handleSubmit = () => {
    const entry: Measurement = {
      date: selectedDate,
      waist: formData.waist ? parseFloat(formData.waist) : undefined,
      chest: formData.chest ? parseFloat(formData.chest) : undefined,
      arms: formData.arms ? parseFloat(formData.arms) : undefined,
      thighs: formData.thighs ? parseFloat(formData.thighs) : undefined,
      hips: formData.hips ? parseFloat(formData.hips) : undefined,
    };
    addMeasurement(entry);
    setFormData({});
    setShowForm(false);
    loadData();
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const chartData = measurements.map((m) => {
    const { date: rawDate, ...rest } = m;
    return {
      date: format(new Date(rawDate), 'M/d'),
      ...rest,
    };
  });

  const latestMeasurement = measurements[measurements.length - 1];
  const firstMeasurement = measurements[0];

  const getChange = (key: keyof Measurement) => {
    if (!latestMeasurement || !firstMeasurement) return null;
    const latest = latestMeasurement[key];
    const first = firstMeasurement[key];
    if (typeof latest !== 'number' || typeof first !== 'number') return null;
    return first - latest;
  };

  const selectedTypeConfig = MEASUREMENT_TYPES.find(t => t.key === selectedType);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Body Stats</h1>
          <p className="text-gray-400 text-sm">Track measurements</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={18} className="mr-1" /> Log
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4" glow>
          <div className="space-y-4">
            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={setSelectedDate}
            />
            <div className="grid grid-cols-2 gap-3">
              {MEASUREMENT_TYPES.map(({ key, label }) => (
                <Input
                  key={key}
                  label={label}
                  type="number"
                  value={formData[key] || ''}
                  onChange={(v) => setFormData({ ...formData, [key]: v })}
                  placeholder="0.0"
                  suffix="in"
                  step={0.1}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">Save</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary">Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Current Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {MEASUREMENT_TYPES.slice(0, 3).map(({ key, label, color }) => {
          const value = latestMeasurement?.[key as keyof Measurement];
          const change = getChange(key as keyof Measurement);
          return (
            <Card key={key} className="text-center py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold" style={{ color }}>
                {value ?? '--'}
                {value && <span className="text-xs text-gray-400 ml-0.5">in</span>}
              </p>
              {change !== null && change > 0 && (
                <p className="text-[10px] text-[#10b981]">-{change.toFixed(1)}&quot;</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Type Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {MEASUREMENT_TYPES.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedType === key
                ? 'text-white'
                : 'bg-[#1a1a24] text-gray-400 hover:text-white'
            }`}
            style={selectedType === key ? { backgroundColor: color } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">{selectedTypeConfig?.label} Trend</h3>
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
                  domain={['dataMin - 1', 'dataMax + 1']}
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
                />
                <Line
                  type="monotone"
                  dataKey={selectedType}
                  stroke={selectedTypeConfig?.color}
                  strokeWidth={2}
                  dot={{ fill: selectedTypeConfig?.color, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Ruler size={32} className="mx-auto mb-2 opacity-50" />
              <p>No measurements yet</p>
            </div>
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 mb-3">History</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {[...measurements].reverse().slice(0, 10).map((entry, i) => (
            <div key={i} className="py-2 border-b border-white/5 last:border-0">
              <p className="text-sm text-gray-400 mb-1">
                {format(new Date(entry.date), 'MMM d, yyyy')}
              </p>
              <div className="flex flex-wrap gap-2">
                {MEASUREMENT_TYPES.map(({ key, label, color }) => {
                  const value = entry[key as keyof Measurement];
                  if (!value) return null;
                  return (
                    <span
                      key={key}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {label}: {value}&quot;
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {measurements.length === 0 && (
            <p className="text-gray-500 text-center py-4">No entries yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
