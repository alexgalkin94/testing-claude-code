'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import ProgressRing from '@/components/ProgressRing';
import { getCaloriesForDate, addMeal, removeMeal, getSettings, CalorieEntry } from '@/lib/storage';

export default function CaloriesPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dayData, setDayData] = useState<CalorieEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [targets, setTargets] = useState({ calories: 2000, protein: 150 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const settings = getSettings();
    if (settings) {
      setTargets({ calories: settings.calorieTarget, protein: settings.proteinTarget });
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      loadDayData();
    }
  }, [selectedDate, mounted]);

  const loadDayData = () => {
    setDayData(getCaloriesForDate(selectedDate));
  };

  const handleAddMeal = () => {
    if (!mealName || !mealCalories) return;
    addMeal(selectedDate, {
      name: mealName,
      calories: parseInt(mealCalories),
      protein: parseInt(mealProtein) || 0,
      time: format(new Date(), 'HH:mm'),
    });
    setMealName('');
    setMealCalories('');
    setMealProtein('');
    setShowForm(false);
    loadDayData();
  };

  const handleRemoveMeal = (index: number) => {
    removeMeal(selectedDate, index);
    loadDayData();
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(format(current, 'yyyy-MM-dd'));
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const calories = dayData?.calories || 0;
  const protein = dayData?.protein || 0;
  const calorieProgress = Math.round((calories / targets.calories) * 100);
  const proteinProgress = Math.round((protein / targets.protein) * 100);

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calories</h1>
          <p className="text-gray-400 text-sm">Track your intake</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={18} className="mr-1" /> Add
        </Button>
      </div>

      {/* Date Selector */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/5 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-medium">{isToday ? 'Today' : format(new Date(selectedDate), 'EEEE')}</p>
            <p className="text-sm text-gray-400">{format(new Date(selectedDate), 'MMM d, yyyy')}</p>
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30"
            disabled={isToday}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </Card>

      {showForm && (
        <Card className="mb-4" glow>
          <div className="space-y-4">
            <Input
              label="Meal name"
              value={mealName}
              onChange={setMealName}
              placeholder="Chicken breast & rice"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Calories"
                type="number"
                value={mealCalories}
                onChange={setMealCalories}
                placeholder="500"
                suffix="cal"
              />
              <Input
                label="Protein"
                type="number"
                value={mealProtein}
                onChange={setMealProtein}
                placeholder="40"
                suffix="g"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddMeal} className="flex-1">Add Meal</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary">Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Progress Rings */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="flex flex-col items-center py-4">
          <ProgressRing
            progress={calorieProgress}
            size={100}
            strokeWidth={8}
            color={calorieProgress > 100 ? '#ef4444' : '#8b5cf6'}
          >
            <div className="text-center">
              <p className="text-lg font-bold">{calories}</p>
              <p className="text-[10px] text-gray-400">cal</p>
            </div>
          </ProgressRing>
          <p className="text-xs text-gray-400 mt-2">{targets.calories - calories} left</p>
        </Card>

        <Card className="flex flex-col items-center py-4">
          <ProgressRing
            progress={proteinProgress}
            size={100}
            strokeWidth={8}
            color={proteinProgress >= 100 ? '#10b981' : '#f59e0b'}
          >
            <div className="text-center">
              <p className="text-lg font-bold">{protein}g</p>
              <p className="text-[10px] text-gray-400">protein</p>
            </div>
          </ProgressRing>
          <p className="text-xs text-gray-400 mt-2">{Math.max(0, targets.protein - protein)}g left</p>
        </Card>
      </div>

      {/* Meals List */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Meals</h3>
        <div className="space-y-2">
          {dayData?.meals.map((meal, i) => (
            <div key={i} className="flex justify-between items-center py-3 px-3 bg-[#1a1a24] rounded-xl">
              <div className="flex-1">
                <p className="font-medium">{meal.name}</p>
                <p className="text-sm text-gray-400">
                  {meal.calories} cal • {meal.protein}g protein
                </p>
              </div>
              <button
                onClick={() => handleRemoveMeal(i)}
                className="p-2 text-gray-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!dayData || dayData.meals.length === 0) && (
            <p className="text-gray-500 text-center py-8">No meals logged yet</p>
          )}
        </div>
      </Card>

      {/* Quick Add Presets */}
      <div className="mt-4">
        <p className="text-xs text-gray-400 mb-2">Quick add</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { name: 'Protein Shake', cal: 150, pro: 25 },
            { name: 'Chicken Breast', cal: 165, pro: 31 },
            { name: 'Greek Yogurt', cal: 100, pro: 17 },
            { name: 'Eggs (2)', cal: 140, pro: 12 },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                addMeal(selectedDate, {
                  name: preset.name,
                  calories: preset.cal,
                  protein: preset.pro,
                  time: format(new Date(), 'HH:mm'),
                });
                loadDayData();
              }}
              className="flex-shrink-0 px-3 py-2 bg-[#1a1a24] rounded-lg text-sm hover:bg-[#2a2a3a]"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
