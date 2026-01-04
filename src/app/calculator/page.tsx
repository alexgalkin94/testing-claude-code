'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calculator, Save, CheckCircle } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { saveSettings, getSettings, UserSettings } from '@/lib/storage';
import { useRouter } from 'next/navigation';

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 1.375, label: 'Light', desc: 'Exercise 1-3 days/week' },
  { value: 1.55, label: 'Moderate', desc: 'Exercise 3-5 days/week' },
  { value: 1.725, label: 'Active', desc: 'Exercise 6-7 days/week' },
  { value: 1.9, label: 'Very Active', desc: 'Hard exercise daily' },
];

export default function CalculatorPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState(1.55);
  const [deficitPercent, setDeficitPercent] = useState(20);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = getSettings();
    if (existing) {
      setName(existing.name || '');
      setCurrentWeight(existing.startWeight?.toString() || '');
      setGoalWeight(existing.goalWeight?.toString() || '');
    }
  }, []);

  // Calculate BMR using Mifflin-St Jeor
  const calculateBMR = () => {
    const w = parseFloat(currentWeight) * 0.453592; // lbs to kg
    const h = parseFloat(height) * 2.54; // inches to cm
    const a = parseInt(age);

    if (!w || !h || !a) return 0;

    if (gender === 'male') {
      return 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      return 10 * w + 6.25 * h - 5 * a - 161;
    }
  };

  const bmr = calculateBMR();
  const tdee = Math.round(bmr * activityLevel);
  const deficit = Math.round(tdee * (deficitPercent / 100));
  const targetCalories = tdee - deficit;
  const targetProtein = Math.round(parseFloat(goalWeight) || parseFloat(currentWeight) || 150);
  const weeklyLoss = ((deficit * 7) / 3500).toFixed(1);

  const handleSave = () => {
    const settings: UserSettings = {
      name,
      startWeight: parseFloat(currentWeight),
      goalWeight: parseFloat(goalWeight),
      calorieTarget: targetCalories,
      proteinTarget: targetProtein,
      tdee,
      startDate: format(new Date(), 'yyyy-MM-dd'),
    };
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calculator</h1>
        <p className="text-gray-400 text-sm">Set up your cutting targets</p>
      </div>

      {/* Personal Info */}
      <Card className="mb-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Calculator size={18} className="text-[#8b5cf6]" />
          Personal Info
        </h3>
        <div className="space-y-4">
          <Input
            label="Name (optional)"
            value={name}
            onChange={setName}
            placeholder="Your name"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Age"
              type="number"
              value={age}
              onChange={setAge}
              placeholder="25"
              suffix="yrs"
            />
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Gender</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                    gender === 'male'
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-[#1a1a24] text-gray-400'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                    gender === 'female'
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-[#1a1a24] text-gray-400'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Height"
              type="number"
              value={height}
              onChange={setHeight}
              placeholder="70"
              suffix="in"
            />
            <Input
              label="Current Weight"
              type="number"
              value={currentWeight}
              onChange={setCurrentWeight}
              placeholder="185"
              suffix="lbs"
            />
          </div>
          <Input
            label="Goal Weight"
            type="number"
            value={goalWeight}
            onChange={setGoalWeight}
            placeholder="170"
            suffix="lbs"
          />
        </div>
      </Card>

      {/* Activity Level */}
      <Card className="mb-4">
        <h3 className="font-medium mb-4">Activity Level</h3>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setActivityLevel(level.value)}
              className={`w-full p-3 rounded-xl text-left transition-all ${
                activityLevel === level.value
                  ? 'bg-[#8b5cf6] text-white'
                  : 'bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a]'
              }`}
            >
              <p className="font-medium">{level.label}</p>
              <p className={`text-sm ${activityLevel === level.value ? 'text-white/70' : 'text-gray-500'}`}>
                {level.desc}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {/* Deficit Slider */}
      <Card className="mb-4">
        <h3 className="font-medium mb-4">Calorie Deficit</h3>
        <div className="mb-4">
          <input
            type="range"
            min="10"
            max="30"
            step="5"
            value={deficitPercent}
            onChange={(e) => setDeficitPercent(parseInt(e.target.value))}
            className="w-full accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>Conservative</span>
            <span className="text-[#8b5cf6] font-medium">{deficitPercent}%</span>
            <span>Aggressive</span>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          {deficitPercent <= 15 && 'Slower but more sustainable. Great for preserving muscle.'}
          {deficitPercent === 20 && 'The sweet spot for most people. Good balance of speed and sustainability.'}
          {deficitPercent >= 25 && 'Faster results but harder to maintain. May impact energy and performance.'}
        </p>
      </Card>

      {/* Results */}
      {tdee > 0 && (
        <Card className="mb-4" glow>
          <h3 className="font-medium mb-4 text-[#8b5cf6]">Your Targets</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-[#1a1a24] rounded-xl">
              <p className="text-2xl font-bold">{tdee}</p>
              <p className="text-xs text-gray-400">TDEE (maintenance)</p>
            </div>
            <div className="text-center p-3 bg-[#1a1a24] rounded-xl">
              <p className="text-2xl font-bold text-[#8b5cf6]">{targetCalories}</p>
              <p className="text-xs text-gray-400">Target calories</p>
            </div>
            <div className="text-center p-3 bg-[#1a1a24] rounded-xl">
              <p className="text-2xl font-bold text-[#10b981]">{targetProtein}g</p>
              <p className="text-xs text-gray-400">Protein target</p>
            </div>
            <div className="text-center p-3 bg-[#1a1a24] rounded-xl">
              <p className="text-2xl font-bold text-[#f59e0b]">~{weeklyLoss}</p>
              <p className="text-xs text-gray-400">lbs/week</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center">
            Protein set to 1g per lb of goal body weight
          </p>
        </Card>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        className="w-full"
        disabled={!tdee || !goalWeight || saved}
        size="lg"
      >
        {saved ? (
          <>
            <CheckCircle size={18} className="mr-2" />
            Saved!
          </>
        ) : (
          <>
            <Save size={18} className="mr-2" />
            Save & Start Cutting
          </>
        )}
      </Button>
    </div>
  );
}
