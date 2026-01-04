'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, Plus, Utensils } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { DAY_A, DAY_B, getDayType, setDayType, DayPlan, MealOption } from '@/lib/mealPlan';
import { addMeal, getCaloriesForDate } from '@/lib/storage';

export default function MealPlanPage() {
  const [dayType, setDayTypeState] = useState<'A' | 'B'>('A');
  const [loggedMeals, setLoggedMeals] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDayTypeState(getDayType());
    loadLoggedMeals();
  }, []);

  const loadLoggedMeals = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const data = getCaloriesForDate(today);
    if (data) {
      setLoggedMeals(data.meals.map(m => m.name));
    }
  };

  const handleDayToggle = (type: 'A' | 'B') => {
    setDayTypeState(type);
    setDayType(type);
  };

  const handleLogMeal = (option: MealOption) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    addMeal(today, {
      name: option.name,
      calories: option.calories,
      protein: option.protein,
      time: format(new Date(), 'HH:mm'),
    });
    loadLoggedMeals();
  };

  const handleLogFullMeal = (meal: DayPlan['meals'][0]) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    addMeal(today, {
      name: meal.name,
      calories: meal.totalCalories,
      protein: meal.totalProtein,
      time: format(new Date(), 'HH:mm'),
    });
    loadLoggedMeals();
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const plan = dayType === 'A' ? DAY_A : DAY_B;

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <p className="text-gray-400 text-sm">{plan.description}</p>
      </div>

      {/* Day Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleDayToggle('A')}
          className={`flex-1 py-3 rounded-xl font-medium transition-all ${
            dayType === 'A'
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25'
              : 'bg-[#1a1a24] text-gray-400'
          }`}
        >
          Tag A
          <span className="block text-xs opacity-70">Iglo & Potato</span>
        </button>
        <button
          onClick={() => handleDayToggle('B')}
          className={`flex-1 py-3 rounded-xl font-medium transition-all ${
            dayType === 'B'
              ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/25'
              : 'bg-[#1a1a24] text-gray-400'
          }`}
        >
          Tag B
          <span className="block text-xs opacity-70">Variety</span>
        </button>
      </div>

      {/* Daily Totals */}
      <Card className="mb-4 flex justify-around py-4" glow>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#8b5cf6]">{plan.totalCalories}</p>
          <p className="text-xs text-gray-400">kcal</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#10b981]">{plan.totalProtein}g</p>
          <p className="text-xs text-gray-400">Protein</p>
        </div>
      </Card>

      {/* Meals */}
      {plan.meals.map((meal, mealIndex) => {
        const isLogged = loggedMeals.some(m => m.includes(meal.name.split(' ')[0]));
        return (
          <Card key={mealIndex} className="mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Utensils size={16} className="text-[#8b5cf6]" />
                  {meal.name}
                </h3>
                <p className="text-xs text-gray-500">{meal.time} • {meal.totalCalories} kcal • {meal.totalProtein}g protein</p>
              </div>
              <Button
                size="sm"
                variant={isLogged ? 'secondary' : 'primary'}
                onClick={() => handleLogFullMeal(meal)}
              >
                {isLogged ? <Check size={16} /> : <Plus size={16} />}
              </Button>
            </div>

            <div className="space-y-2">
              {meal.options.map((option, optIndex) => {
                const isOptionLogged = loggedMeals.includes(option.name);
                return (
                  <div
                    key={optIndex}
                    className={`flex justify-between items-center p-2 rounded-lg ${
                      isOptionLogged ? 'bg-[#10b981]/10' : 'bg-[#1a1a24]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isOptionLogged ? 'text-[#10b981]' : ''}`}>
                        {option.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {option.calories} kcal • {option.protein}g P • {option.carbs}g C • {option.fat}g F
                      </p>
                    </div>
                    <button
                      onClick={() => handleLogMeal(option)}
                      className={`p-1.5 rounded-lg ml-2 ${
                        isOptionLogged
                          ? 'text-[#10b981] bg-[#10b981]/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isOptionLogged ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Info */}
      <p className="text-center text-xs text-gray-500 mt-4">
        Wähle Optionen aus jeder Kategorie oder logge die ganze Mahlzeit
      </p>
    </div>
  );
}
