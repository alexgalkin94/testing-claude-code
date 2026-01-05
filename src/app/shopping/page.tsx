'use client';

import { useState } from 'react';
import { Check, Minus, Plus, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@/components/Card';

// Real package sizes you find in German supermarkets
const PACKAGE_SIZES = {
  // Protein - sold by package
  chicken: { name: 'Hähnchenbrust', size: 500, unit: 'g', section: 'Kühlregal' },
  turkey: { name: 'Putenbrust', size: 400, unit: 'g', section: 'Kühlregal' },
  beef: { name: 'Rinderhack 5%', size: 400, unit: 'g', section: 'Kühlregal' },
  pork: { name: 'Schweinefilet', size: 400, unit: 'g', section: 'Kühlregal' },
  fish: { name: 'Fischfilet (TK)', size: 400, unit: 'g', section: 'Tiefkühl' },
  shrimp: { name: 'Garnelen (TK)', size: 225, unit: 'g', section: 'Tiefkühl' },
  tuna: { name: 'Thunfisch Dose', size: 150, unit: 'g', section: 'Konserven' },

  // Eggs
  eggs: { name: 'Eier', size: 10, unit: 'Stück', section: 'Kühlregal' },

  // Dairy
  skyr: { name: 'Skyr', size: 450, unit: 'g', section: 'Kühlregal' },
  quark: { name: 'Magerquark', size: 500, unit: 'g', section: 'Kühlregal' },
  exquisa: { name: 'Exquisa 0,2%', size: 200, unit: 'g', section: 'Kühlregal' },
  cottage: { name: 'Körniger Frischkäse', size: 200, unit: 'g', section: 'Kühlregal' },

  // Meat products
  ham: { name: 'Backschinken', size: 100, unit: 'g', section: 'Kühlregal' }, // ~10 Scheiben

  // Frozen
  iglo: { name: 'Iglo Schlemmer-Filet', size: 1, unit: 'Stück', section: 'Tiefkühl' },
  frosta: { name: 'Frosta Gemüsepfanne', size: 480, unit: 'g', section: 'Tiefkühl' },

  // Carbs (often already at home)
  potatoes: { name: 'Kartoffeln', size: 2000, unit: 'g', section: 'Gemüse' },
  sweetpotatoes: { name: 'Süßkartoffeln', size: 1000, unit: 'g', section: 'Gemüse' },
  rice: { name: 'Reis', size: 500, unit: 'g', section: 'Trockenwaren' },
  pasta: { name: 'Nudeln', size: 500, unit: 'g', section: 'Trockenwaren' },
  oats: { name: 'Haferflocken', size: 500, unit: 'g', section: 'Trockenwaren' },
  bread: { name: 'Toast/Sandwiches', size: 10, unit: 'Stück', section: 'Brot' },
};

interface ShoppingItem {
  id: string;
  needed: number; // packages needed
  inCart: boolean;
}

// Calculate what you need for X days
function calculateNeeds(days: number) {
  // Daily needs based on meal plan
  const dailyProteinGrams = 400; // ~200g lunch + ~200g dinner
  const dailyEggs = 3;
  const dailyDairyGrams = 200; // evening snack
  const dailyExquisaGrams = 30;
  const dailyHamSlices = 2; // ~20g
  const dailyPotatoesGrams = 300;
  const dailyCarbsGrams = 60; // rice/pasta alternative
  const dailyOatsGrams = 80;

  const totalProtein = days * dailyProteinGrams;
  const totalEggs = days * dailyEggs;
  const totalDairy = days * dailyDairyGrams;
  const totalPotatoes = days * dailyPotatoesGrams;

  return {
    // MUST BUY (fresh, weekly)
    weekly: [
      {
        category: 'Protein',
        totalNeeded: `${(totalProtein / 1000).toFixed(1)}kg`,
        note: 'Mix nach Angebot - alles austauschbar',
        options: [
          { id: 'chicken', packages: Math.ceil(totalProtein / PACKAGE_SIZES.chicken.size) },
          { id: 'turkey', packages: Math.ceil(totalProtein / PACKAGE_SIZES.turkey.size) },
          { id: 'beef', packages: Math.ceil(totalProtein / PACKAGE_SIZES.beef.size) },
          { id: 'fish', packages: Math.ceil(totalProtein / PACKAGE_SIZES.fish.size) },
          { id: 'shrimp', packages: Math.ceil(totalProtein / PACKAGE_SIZES.shrimp.size) },
        ],
      },
      {
        category: 'Eier',
        totalNeeded: `${totalEggs} Stück`,
        note: null,
        options: [
          { id: 'eggs', packages: Math.ceil(totalEggs / PACKAGE_SIZES.eggs.size) },
        ],
      },
      {
        category: 'Milchprodukte',
        totalNeeded: `${(totalDairy / 1000).toFixed(1)}kg Skyr/Quark`,
        note: 'Für Abend-Snack',
        options: [
          { id: 'skyr', packages: Math.ceil(totalDairy / PACKAGE_SIZES.skyr.size) },
          { id: 'quark', packages: Math.ceil(totalDairy / PACKAGE_SIZES.quark.size) },
        ],
      },
      {
        category: 'Exquisa',
        totalNeeded: `${days * dailyExquisaGrams}g`,
        note: 'Fürs Rührei',
        options: [
          { id: 'exquisa', packages: Math.ceil((days * dailyExquisaGrams) / PACKAGE_SIZES.exquisa.size) },
        ],
      },
      {
        category: 'Schinken',
        totalNeeded: `${days * dailyHamSlices} Scheiben`,
        note: 'Fürs Frühstück',
        options: [
          { id: 'ham', packages: Math.ceil((days * dailyHamSlices * 10) / PACKAGE_SIZES.ham.size) },
        ],
      },
      {
        category: 'Kartoffeln',
        totalNeeded: `${(totalPotatoes / 1000).toFixed(1)}kg`,
        note: 'Oder Süßkartoffeln',
        options: [
          { id: 'potatoes', packages: Math.ceil(totalPotatoes / PACKAGE_SIZES.potatoes.size) },
        ],
      },
    ],

    // Frozen (lasts longer)
    frozen: [
      {
        category: 'Iglo Schlemmer-Filet',
        totalNeeded: `${Math.ceil(days / 2)} Stück`,
        note: 'Für Tag A Mittag',
        options: [
          { id: 'iglo', packages: Math.ceil(days / 2) },
        ],
      },
      {
        category: 'Frosta Gemüsepfanne',
        totalNeeded: `${Math.ceil(days * 0.8)} Packungen`,
        note: 'Für Abendessen',
        options: [
          { id: 'frosta', packages: Math.ceil(days * 0.8) },
        ],
      },
    ],

    // Check if needed (often already at home)
    pantry: [
      { id: 'rice', name: 'Reis', needed: days * dailyCarbsGrams > 500 },
      { id: 'pasta', name: 'Nudeln', needed: days * dailyCarbsGrams > 500 },
      { id: 'oats', name: 'Haferflocken', needed: days * dailyOatsGrams > 500 },
      { id: 'bread', name: 'Toast/Sandwiches', needed: true },
    ],
  };
}

export default function ShoppingPage() {
  const [days, setDays] = useState(7);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showPantry, setShowPantry] = useState(false);

  const needs = calculateNeeds(days);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (categoryOptions: { id: string }[]) => {
    const allChecked = categoryOptions.every(o => checkedItems.has(o.id));
    setCheckedItems(prev => {
      const next = new Set(prev);
      categoryOptions.forEach(o => {
        if (allChecked) next.delete(o.id);
        else next.add(o.id);
      });
      return next;
    });
  };

  const resetList = () => setCheckedItems(new Set());

  const weeklyItems = needs.weekly.flatMap(c => c.options);
  const frozenItems = needs.frozen.flatMap(c => c.options);
  const allMainItems = [...weeklyItems, ...frozenItems];
  const checkedMain = allMainItems.filter(i => checkedItems.has(i.id)).length;
  const totalMain = allMainItems.length;

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-sm">Einkaufen für</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDays(d => Math.max(1, d - 1))}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
            >
              <Minus size={16} />
            </button>
            <span className="text-2xl font-bold w-8 text-center">{days}</span>
            <button
              onClick={() => setDays(d => Math.min(14, d + 1))}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
            <span className="text-xl font-semibold text-zinc-400">Tage</span>
          </div>
        </div>
        {checkedItems.size > 0 && (
          <button onClick={resetList} className="p-2 text-zinc-500 hover:text-white">
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* Progress */}
      {checkedMain > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-500">{checkedMain} von {totalMain}</span>
            {checkedMain === totalMain && <span className="text-emerald-500">Fertig! ✓</span>}
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(checkedMain / totalMain) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Weekly Shopping */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wide">
          🛒 Diese Woche kaufen
        </h2>
        <div className="space-y-2">
          {needs.weekly.map(category => {
            const isChecked = category.options.every(o => checkedItems.has(o.id));
            const pkg = PACKAGE_SIZES[category.options[0].id as keyof typeof PACKAGE_SIZES];
            const count = category.options[0].packages;

            return (
              <div
                key={category.category}
                onClick={() => toggleCategory(category.options)}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                  isChecked ? 'bg-emerald-500/10 opacity-60' : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                }`}>
                  {isChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <span className={`font-medium ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                      {category.category}
                    </span>
                    <span className={`text-lg font-bold ${isChecked ? 'text-zinc-600' : 'text-white'}`}>
                      {count}×
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs text-zinc-500">
                      {category.note || `${pkg.size}${pkg.unit} Packung`}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {category.totalNeeded}
                    </span>
                  </div>
                  {category.options.length > 1 && !isChecked && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {category.options.map(opt => {
                        const p = PACKAGE_SIZES[opt.id as keyof typeof PACKAGE_SIZES];
                        return (
                          <span key={opt.id} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {p.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Frozen */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wide">
          ❄️ Tiefkühl
        </h2>
        <div className="space-y-2">
          {needs.frozen.map(category => {
            const isChecked = category.options.every(o => checkedItems.has(o.id));
            const count = category.options[0].packages;

            return (
              <div
                key={category.category}
                onClick={() => toggleCategory(category.options)}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                  isChecked ? 'bg-emerald-500/10 opacity-60' : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                }`}>
                  {isChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className={`font-medium ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                      {category.category}
                    </span>
                    <span className={`text-lg font-bold ${isChecked ? 'text-zinc-600' : 'text-white'}`}>
                      {count}×
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{category.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pantry Check */}
      <div>
        <button
          onClick={() => setShowPantry(!showPantry)}
          className="flex items-center gap-2 text-sm text-zinc-500 mb-3"
        >
          {showPantry ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="uppercase tracking-wide font-medium">Vorrat checken</span>
          <span className="text-zinc-600">(hast du vielleicht noch)</span>
        </button>

        {showPantry && (
          <div className="space-y-2">
            {needs.pantry.map(item => {
              const isChecked = checkedItems.has(`pantry-${item.id}`);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(`pantry-${item.id}`)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isChecked ? 'bg-zinc-800/50 opacity-60' : 'bg-zinc-900/50 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isChecked ? 'bg-zinc-600 border-zinc-600' : 'border-zinc-700'
                  }`}>
                    {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm ${isChecked ? 'line-through text-zinc-600' : 'text-zinc-400'}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-600 ml-auto">
                    {isChecked ? 'Hab ich' : 'Brauche ich?'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
