'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { TrendingDown, Flame, Target, Calendar, ClipboardList } from 'lucide-react';
import Card from '@/components/Card';
import ProgressRing from '@/components/ProgressRing';
import {
  getWeights,
  getCaloriesForDate,
  getSettings,
  WeightEntry,
} from '@/lib/storage';
import { getDayType } from '@/lib/mealPlan';
import Link from 'next/link';

export default function Dashboard() {
  const [settings, setSettings] = useState({ calorieTarget: 1700, proteinTarget: 157, startWeight: 0, goalWeight: 0, startDate: '' });
  const [todayCalories, setTodayCalories] = useState({ calories: 0, protein: 0 });
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [weightChange, setWeightChange] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dayType, setDayType] = useState<'A' | 'B'>('A');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSettings();
    setSettings(s);
    setDayType(getDayType());

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayCals = getCaloriesForDate(today);
    if (todayCals) {
      setTodayCalories({ calories: todayCals.calories, protein: todayCals.protein });
    }

    const weights = getWeights();
    if (weights.length > 0) {
      setLatestWeight(weights[weights.length - 1]);
      if (s?.startWeight) {
        setWeightChange(s.startWeight - weights[weights.length - 1].weight);
      }
    }

    // Calculate streak (days with logged data)
    let currentStreak = 0;
    const sortedDates = weights.map(w => w.date).sort().reverse();
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = format(
        new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );
      if (sortedDates[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
    setStreak(currentStreak);
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-[#1a1a24] rounded w-1/2 mb-8"></div>
        <div className="h-40 bg-[#1a1a24] rounded-2xl mb-4"></div>
        <div className="h-24 bg-[#1a1a24] rounded-2xl"></div>
      </div>
    );
  }

  const calorieProgress = Math.round((todayCalories.calories / settings.calorieTarget) * 100);
  const proteinProgress = Math.round((todayCalories.protein / settings.proteinTarget) * 100);
  const remaining = settings.calorieTarget - todayCalories.calories;
  const proteinRemaining = settings.proteinTarget - todayCalories.protein;

  const daysIn = settings.startDate
    ? differenceInDays(new Date(), new Date(settings.startDate))
    : 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-gray-400 text-sm">{format(new Date(), 'EEEE, d. MMM')}</p>
          <h1 className="text-2xl font-bold">Cutting Phase</h1>
        </div>
        <Link href="/plan">
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            dayType === 'A' ? 'bg-[#8b5cf6]' : 'bg-[#10b981]'
          }`}>
            Tag {dayType}
          </div>
        </Link>
      </div>

      {/* Main Progress Ring */}
      <Card className="mb-4 flex flex-col items-center py-6" glow>
        <ProgressRing progress={calorieProgress} size={160} strokeWidth={12}>
          <div className="text-center">
            <p className="text-3xl font-bold">{todayCalories.calories}</p>
            <p className="text-xs text-gray-400">/ {settings.calorieTarget} kcal</p>
          </div>
        </ProgressRing>
        <div className="flex justify-around w-full mt-6 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#10b981]">{todayCalories.protein}g</p>
            <p className="text-xs text-gray-400">/ {settings.proteinTarget}g Protein</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-semibold ${remaining >= 0 ? 'text-[#8b5cf6]' : 'text-[#ef4444]'}`}>
              {remaining}
            </p>
            <p className="text-xs text-gray-400">kcal übrig</p>
          </div>
        </div>
      </Card>

      {/* Today's Progress */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <p className="text-xs text-gray-400 mb-1">Kalorien</p>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold">{calorieProgress}%</p>
            <p className={`text-xs ${calorieProgress > 100 ? 'text-[#ef4444]' : 'text-gray-500'}`}>
              {remaining >= 0 ? `${remaining} übrig` : `${Math.abs(remaining)} drüber`}
            </p>
          </div>
          <div className="mt-2 h-2 bg-[#1a1a24] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${calorieProgress > 100 ? 'bg-[#ef4444]' : 'bg-[#8b5cf6]'}`}
              style={{ width: `${Math.min(calorieProgress, 100)}%` }}
            />
          </div>
        </Card>

        <Card>
          <p className="text-xs text-gray-400 mb-1">Protein</p>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold">{proteinProgress}%</p>
            <p className={`text-xs ${proteinProgress >= 100 ? 'text-[#10b981]' : 'text-gray-500'}`}>
              {proteinRemaining > 0 ? `${proteinRemaining}g übrig` : 'Ziel erreicht!'}
            </p>
          </div>
          <div className="mt-2 h-2 bg-[#1a1a24] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${proteinProgress >= 100 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`}
              style={{ width: `${Math.min(proteinProgress, 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {latestWeight && (
          <Card className="text-center">
            <TrendingDown className="mx-auto mb-1 text-[#10b981]" size={18} />
            <p className="text-lg font-bold">{latestWeight.weight}</p>
            <p className="text-[10px] text-gray-400">kg aktuell</p>
          </Card>
        )}
        <Card className="text-center">
          <Flame className="mx-auto mb-1 text-[#f59e0b]" size={18} />
          <p className="text-lg font-bold">{streak}</p>
          <p className="text-[10px] text-gray-400">Tage Streak</p>
        </Card>
        <Card className="text-center">
          <Calendar className="mx-auto mb-1 text-[#8b5cf6]" size={18} />
          <p className="text-lg font-bold">{Math.max(0, daysIn)}</p>
          <p className="text-[10px] text-gray-400">Tag der Cut</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/plan">
          <Card className="text-center py-4 hover:bg-[#1a1a24]">
            <ClipboardList className="mx-auto mb-2 text-[#8b5cf6]" size={24} />
            <p className="text-sm font-medium">Mahlzeit loggen</p>
          </Card>
        </Link>
        <Link href="/weight">
          <Card className="text-center py-4 hover:bg-[#1a1a24]">
            <TrendingDown className="mx-auto mb-2 text-[#10b981]" size={24} />
            <p className="text-sm font-medium">Gewicht loggen</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
