'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { TrendingDown, Flame, Target, Calendar } from 'lucide-react';
import Card from '@/components/Card';
import ProgressRing from '@/components/ProgressRing';
import {
  getWeights,
  getCaloriesForDate,
  getSettings,
  UserSettings,
  WeightEntry,
} from '@/lib/storage';
import Link from 'next/link';

export default function Dashboard() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [todayCalories, setTodayCalories] = useState({ calories: 0, protein: 0 });
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [weightChange, setWeightChange] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getSettings();
    setSettings(s);

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

    // Calculate streak (days with logged calories)
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

  if (!settings) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Welcome to CutBoard</h1>
        <p className="text-gray-400 mb-6">Let&apos;s set up your cutting goals</p>
        <Link href="/calculator">
          <Card className="text-center py-8" glow>
            <Target className="mx-auto mb-3 text-[#8b5cf6]" size={40} />
            <p className="text-lg font-medium">Set Up Your Goals</p>
            <p className="text-sm text-gray-400 mt-1">Calculate TDEE & targets</p>
          </Card>
        </Link>
      </div>
    );
  }

  const calorieProgress = Math.round((todayCalories.calories / settings.calorieTarget) * 100);
  const proteinProgress = Math.round((todayCalories.protein / settings.proteinTarget) * 100);
  const weightProgress = settings.startWeight !== settings.goalWeight
    ? Math.round((weightChange / (settings.startWeight - settings.goalWeight)) * 100)
    : 0;

  const daysIn = differenceInDays(new Date(), new Date(settings.startDate));

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm">{format(new Date(), 'EEEE, MMM d')}</p>
        <h1 className="text-2xl font-bold">Hey{settings.name ? `, ${settings.name}` : ''} 👋</h1>
      </div>

      {/* Main Progress Ring */}
      <Card className="mb-4 flex flex-col items-center py-6" glow>
        <ProgressRing progress={calorieProgress} size={160} strokeWidth={12}>
          <div className="text-center">
            <p className="text-3xl font-bold">{todayCalories.calories}</p>
            <p className="text-xs text-gray-400">/ {settings.calorieTarget} cal</p>
          </div>
        </ProgressRing>
        <div className="flex justify-around w-full mt-6 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#10b981]">{todayCalories.protein}g</p>
            <p className="text-xs text-gray-400">Protein ({proteinProgress}%)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#8b5cf6]">{settings.calorieTarget - todayCalories.calories}</p>
            <p className="text-xs text-gray-400">Remaining</p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Current Weight</p>
              <p className="text-xl font-bold">
                {latestWeight?.weight || settings.startWeight}
                <span className="text-sm text-gray-400 ml-1">lbs</span>
              </p>
            </div>
            <TrendingDown className="text-[#10b981]" size={20} />
          </div>
          {weightChange > 0 && (
            <p className="text-xs text-[#10b981] mt-2">-{weightChange.toFixed(1)} lbs total</p>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Goal Weight</p>
              <p className="text-xl font-bold">
                {settings.goalWeight}
                <span className="text-sm text-gray-400 ml-1">lbs</span>
              </p>
            </div>
            <Target className="text-[#8b5cf6]" size={20} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{weightProgress}% there</p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Streak</p>
              <p className="text-xl font-bold">{streak} <span className="text-sm">days</span></p>
            </div>
            <Flame className="text-[#f59e0b]" size={20} />
          </div>
          <p className="text-xs text-gray-400 mt-2">Keep it up!</p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Day</p>
              <p className="text-xl font-bold">{daysIn}</p>
            </div>
            <Calendar className="text-[#8b5cf6]" size={20} />
          </div>
          <p className="text-xs text-gray-400 mt-2">of your cut</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/calories">
          <Card className="text-center py-4 hover:bg-[#1a1a24]">
            <Flame className="mx-auto mb-2 text-[#f59e0b]" size={24} />
            <p className="text-sm font-medium">Log Meal</p>
          </Card>
        </Link>
        <Link href="/weight">
          <Card className="text-center py-4 hover:bg-[#1a1a24]">
            <TrendingDown className="mx-auto mb-2 text-[#10b981]" size={24} />
            <p className="text-sm font-medium">Log Weight</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
