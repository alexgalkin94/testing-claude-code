'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, ChevronDown } from 'lucide-react';
import Card from '@/components/Card';
import {
  DAY_A,
  DAY_B,
  DayPlan,
  MealItem,
  toggleItem,
  isItemChecked,
  getDayType,
  setDayType,
} from '@/lib/mealPlan';

export default function TodayPage() {
  const [dayType, setDayTypeState] = useState<'A' | 'B'>('A');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const today = format(new Date(), 'yyyy-MM-dd');
  const plan: DayPlan = dayType === 'A' ? DAY_A : DAY_B;

  useEffect(() => {
    setMounted(true);
    const savedType = getDayType();
    setDayTypeState(savedType);

    // Load checked items for today
    const checked = new Set<string>();
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        if (isItemChecked(today, item.id)) {
          checked.add(item.id);
        }
      });
    });
    setCheckedItems(checked);
  }, [today]);

  // Reload checked items when day type changes
  useEffect(() => {
    if (!mounted) return;
    const currentPlan = dayType === 'A' ? DAY_A : DAY_B;
    const checked = new Set<string>();
    currentPlan.meals.forEach(meal => {
      meal.items.forEach(item => {
        if (isItemChecked(today, item.id)) {
          checked.add(item.id);
        }
      });
    });
    setCheckedItems(checked);
  }, [dayType, today, mounted]);

  const handleToggle = (itemId: string) => {
    toggleItem(today, itemId);
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleDayChange = (type: 'A' | 'B') => {
    setDayTypeState(type);
    setDayType(type);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Calculate consumed macros
  const consumed = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  plan.meals.forEach(meal => {
    meal.items.forEach(item => {
      if (checkedItems.has(item.id)) {
        consumed.calories += item.calories;
        consumed.protein += item.protein;
        consumed.carbs += item.carbs;
        consumed.fat += item.fat;
      }
    });
  });

  const completedCount = checkedItems.size;
  const totalItems = plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);

  if (!mounted) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-[#1a1a24] rounded w-1/2 mb-4"></div>
        <div className="h-12 bg-[#1a1a24] rounded-xl mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-[#1a1a24] rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <p className="text-gray-400 text-sm">
          {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
        </p>
        <h1 className="text-2xl font-bold">Heute</h1>
      </div>

      {/* Day Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleDayChange('A')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            dayType === 'A'
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25'
              : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252532]'
          }`}
        >
          Tag A - Iglo & Potato
        </button>
        <button
          onClick={() => handleDayChange('B')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            dayType === 'B'
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25'
              : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252532]'
          }`}
        >
          Tag B - Variety
        </button>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Fortschritt</span>
          <span className="text-sm font-medium">{completedCount}/{totalItems}</span>
        </div>
        <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#10b981] transition-all duration-300"
            style={{ width: `${(completedCount / totalItems) * 100}%` }}
          />
        </div>

        {/* Macro Summary */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-lg font-bold text-[#8b5cf6]">{consumed.calories}</p>
            <p className="text-[10px] text-gray-400">/ {plan.totals.calories} kcal</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#10b981]">{consumed.protein}g</p>
            <p className="text-[10px] text-gray-400">/ {plan.totals.protein}g P</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#f59e0b]">{consumed.carbs}g</p>
            <p className="text-[10px] text-gray-400">/ {plan.totals.carbs}g K</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#ef4444]">{consumed.fat}g</p>
            <p className="text-[10px] text-gray-400">/ {plan.totals.fat}g F</p>
          </div>
        </div>
      </Card>

      {/* Meals */}
      <div className="space-y-4">
        {plan.meals.map(meal => (
          <Card key={meal.id}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-semibold">{meal.name}</h3>
                <p className="text-xs text-gray-400">{meal.time}</p>
              </div>
              <div className="text-right text-xs text-gray-400">
                {meal.items.filter(i => checkedItems.has(i.id)).length}/{meal.items.length}
              </div>
            </div>

            <div className="space-y-2">
              {meal.items.map(item => (
                <MealItemRow
                  key={item.id}
                  item={item}
                  checked={checkedItems.has(item.id)}
                  expanded={expandedItems.has(item.id)}
                  onToggle={() => handleToggle(item.id)}
                  onExpand={() => toggleExpanded(item.id)}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MealItemRow({
  item,
  checked,
  expanded,
  onToggle,
  onExpand,
}: {
  item: MealItem;
  checked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const hasOptions = item.options && item.options.length > 0;

  return (
    <div className={`rounded-lg transition-all ${checked ? 'bg-[#10b981]/10' : 'bg-[#1a1a24]'}`}>
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
            checked
              ? 'bg-[#10b981] text-white'
              : 'bg-[#252532] border border-white/10'
          }`}
        >
          {checked && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${checked ? 'text-gray-400 line-through' : ''}`}>
              {item.name}
            </span>
            {hasOptions && (
              <button
                onClick={onExpand}
                className="text-gray-500 hover:text-gray-300"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>

          {/* Macros */}
          <div className="flex gap-3 mt-1 text-[10px]">
            <span className="text-[#8b5cf6]">{item.calories} kcal</span>
            <span className="text-[#10b981]">{item.protein}g P</span>
            <span className="text-[#f59e0b]">{item.carbs}g K</span>
            <span className="text-[#ef4444]">{item.fat}g F</span>
          </div>
        </div>
      </div>

      {/* Options dropdown */}
      {hasOptions && expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="pl-9 space-y-1">
            {item.options!.map((option, i) => (
              <div key={i} className="text-xs text-gray-400 py-1">
                • {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
