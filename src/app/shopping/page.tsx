'use client';

import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import Card from '@/components/Card';
import { DAY_A, DAY_B } from '@/lib/mealPlan';

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  forDays: ('A' | 'B')[];
}

// Generate shopping list from meal plans
const generateShoppingList = (): ShoppingItem[] => {
  const items: ShoppingItem[] = [];
  const seen = new Set<string>();

  const addItem = (name: string, category: string, day: 'A' | 'B') => {
    const existing = items.find(i => i.name === name);
    if (existing) {
      if (!existing.forDays.includes(day)) {
        existing.forDays.push(day);
      }
    } else {
      items.push({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        category,
        forDays: [day],
      });
    }
  };

  // Day A items
  DAY_A.meals.forEach(meal => {
    meal.items.forEach(item => {
      if (item.options) {
        item.options.forEach(opt => addItem(opt, getCategoryForItem(opt), 'A'));
      } else {
        addItem(item.name, getCategoryForItem(item.name), 'A');
      }
    });
  });

  // Day B items
  DAY_B.meals.forEach(meal => {
    meal.items.forEach(item => {
      if (item.options) {
        item.options.forEach(opt => addItem(opt, getCategoryForItem(opt), 'B'));
      } else {
        addItem(item.name, getCategoryForItem(item.name), 'B');
      }
    });
  });

  return items;
};

const getCategoryForItem = (name: string): string => {
  const lower = name.toLowerCase();

  if (lower.includes('hähnchen') || lower.includes('pute') || lower.includes('rinder') ||
      lower.includes('schweine') || lower.includes('thunfisch') || lower.includes('garnelen') ||
      lower.includes('weißfisch') || lower.includes('schinken') || lower.includes('iglo')) {
    return 'Fleisch & Fisch';
  }
  if (lower.includes('eier')) {
    return 'Eier & Milch';
  }
  if (lower.includes('skyr') || lower.includes('quark') || lower.includes('whey') ||
      lower.includes('exquisa') || lower.includes('frischkäse')) {
    return 'Milchprodukte';
  }
  if (lower.includes('kartoffel') || lower.includes('süßkartoffel') || lower.includes('gemüse') ||
      lower.includes('frosta')) {
    return 'Gemüse & TK';
  }
  if (lower.includes('reis') || lower.includes('nudel') || lower.includes('hafer') ||
      lower.includes('toast') || lower.includes('sandwich') || lower.includes('brötchen')) {
    return 'Kohlenhydrate';
  }
  return 'Sonstiges';
};

const CATEGORY_ORDER = [
  'Fleisch & Fisch',
  'Eier & Milch',
  'Milchprodukte',
  'Gemüse & TK',
  'Kohlenhydrate',
  'Sonstiges',
];

export default function ShoppingPage() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [filterDay, setFilterDay] = useState<'all' | 'A' | 'B'>('all');

  const allItems = generateShoppingList();

  const filteredItems = filterDay === 'all'
    ? allItems
    : allItems.filter(item => item.forDays.includes(filterDay));

  const groupedItems = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryItems = filteredItems.filter(item => item.category === category);
    if (categoryItems.length > 0) {
      acc[category] = categoryItems;
    }
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const checkedCount = checkedItems.size;
  const totalCount = filteredItems.length;

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Einkaufsliste</h1>
        <p className="text-gray-400 text-sm">Basierend auf deinem Ernährungsplan</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'A', 'B'] as const).map(day => (
          <button
            key={day}
            onClick={() => setFilterDay(day)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filterDay === day
                ? 'bg-[#8b5cf6] text-white'
                : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252532]'
            }`}
          >
            {day === 'all' ? 'Alle' : `Tag ${day}`}
          </button>
        ))}
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-[#8b5cf6]" size={20} />
            <span className="text-sm text-gray-400">Fortschritt</span>
          </div>
          <span className="text-sm font-medium">{checkedCount}/{totalCount}</span>
        </div>
        <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#10b981] transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {/* Categories */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <Card key={category}>
            <h3 className="font-semibold text-sm text-gray-400 mb-3">{category}</h3>
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    checkedItems.has(item.id) ? 'bg-[#10b981]/10' : 'bg-[#1a1a24]'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                      checkedItems.has(item.id)
                        ? 'bg-[#10b981] text-white'
                        : 'bg-[#252532] border border-white/10'
                    }`}
                  >
                    {checkedItems.has(item.id) && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span
                    className={`text-sm flex-1 ${
                      checkedItems.has(item.id) ? 'text-gray-500 line-through' : ''
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="flex gap-1">
                    {item.forDays.map(day => (
                      <span
                        key={day}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          day === 'A' ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'bg-[#10b981]/20 text-[#10b981]'
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
