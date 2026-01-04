'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
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
  const [targets, setTargets] = useState({ calories: 1700, protein: 157 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const settings = getSettings();
    setTargets({ calories: settings.calorieTarget, protein: settings.proteinTarget });
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

  const quickAdd = (name: string, cal: number, pro: number) => {
    addMeal(selectedDate, {
      name,
      calories: cal,
      protein: pro,
      time: format(new Date(), 'HH:mm'),
    });
    loadDayData();
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const calories = dayData?.calories || 0;
  const protein = dayData?.protein || 0;
  const calorieProgress = Math.round((calories / targets.calories) * 100);
  const proteinProgress = Math.round((protein / targets.protein) * 100);
  const remaining = targets.calories - calories;
  const proteinRemaining = targets.protein - protein;

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ernährung</h1>
          <p className="text-gray-400 text-sm">{targets.calories} kcal • {targets.protein}g Protein</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={18} className="mr-1" /> Manuell
        </Button>
      </div>

      {/* Date Selector */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/5 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-medium">{isToday ? 'Heute' : format(new Date(selectedDate), 'EEEE', { locale: de })}</p>
            <p className="text-sm text-gray-400">{format(new Date(selectedDate), 'd. MMM yyyy', { locale: de })}</p>
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
              label="Mahlzeit"
              value={mealName}
              onChange={setMealName}
              placeholder="z.B. Hähnchen mit Reis"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Kalorien"
                type="number"
                value={mealCalories}
                onChange={setMealCalories}
                placeholder="500"
                suffix="kcal"
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
              <Button onClick={handleAddMeal} className="flex-1">Hinzufügen</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary">Abbrechen</Button>
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
              <p className="text-[10px] text-gray-400">kcal</p>
            </div>
          </ProgressRing>
          <p className={`text-xs mt-2 ${remaining < 0 ? 'text-[#ef4444]' : 'text-gray-400'}`}>
            {remaining >= 0 ? `${remaining} übrig` : `${Math.abs(remaining)} drüber`}
          </p>
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
              <p className="text-[10px] text-gray-400">Protein</p>
            </div>
          </ProgressRing>
          <p className={`text-xs mt-2 ${proteinProgress >= 100 ? 'text-[#10b981]' : 'text-gray-400'}`}>
            {proteinRemaining > 0 ? `${proteinRemaining}g übrig` : 'Ziel erreicht!'}
          </p>
        </Card>
      </div>

      {/* Quick Add - Meal Plan Items */}
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-400">Schnell hinzufügen</h3>
          <a href="/plan" className="text-xs text-[#8b5cf6]">Zum Meal Plan →</a>
        </div>

        {/* Full Meals */}
        <p className="text-xs text-gray-500 mb-2">Komplette Mahlzeiten</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {[
            { name: 'Frühstück komplett', cal: 630, pro: 40 },
            { name: 'Iglo + Kartoffeln', cal: 470, pro: 45 },
            { name: 'Hähnchen + Gemüse', cal: 475, pro: 50 },
            { name: 'Mittag (Tag B)', cal: 590, pro: 55 },
            { name: 'Abend (Tag B)', cal: 390, pro: 45 },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => quickAdd(preset.name, preset.cal, preset.pro)}
              className="flex-shrink-0 px-3 py-2 bg-[#1a1a24] rounded-lg text-sm hover:bg-[#2a2a3a]"
            >
              <span className="block">{preset.name}</span>
              <span className="text-xs text-gray-500">{preset.cal} • {preset.pro}g</span>
            </button>
          ))}
        </div>

        {/* Individual Items */}
        <p className="text-xs text-gray-500 mb-2">Einzelne Items</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { name: '3 Eier', cal: 230, pro: 20 },
            { name: 'Skyr 200g', cal: 130, pro: 22 },
            { name: 'Whey Shake', cal: 120, pro: 24 },
            { name: 'Hähnchen 200g', cal: 220, pro: 46 },
            { name: 'Frosta Gemüse 480g', cal: 260, pro: 8 },
            { name: 'Magerquark 200g', cal: 135, pro: 24 },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => quickAdd(preset.name, preset.cal, preset.pro)}
              className="flex-shrink-0 px-3 py-2 bg-[#1a1a24] rounded-lg text-sm hover:bg-[#2a2a3a]"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Meals List */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Heutige Mahlzeiten</h3>
        <div className="space-y-2">
          {dayData?.meals.map((meal, i) => (
            <div key={i} className="flex justify-between items-center py-3 px-3 bg-[#1a1a24] rounded-xl">
              <div className="flex-1">
                <p className="font-medium">{meal.name}</p>
                <p className="text-sm text-gray-400">
                  {meal.calories} kcal • {meal.protein}g Protein
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
            <p className="text-gray-500 text-center py-8">Noch keine Mahlzeiten eingetragen</p>
          )}
        </div>
      </Card>
    </div>
  );
}
