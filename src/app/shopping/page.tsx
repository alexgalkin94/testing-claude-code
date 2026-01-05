'use client';

import { useState } from 'react';
import { Check, ShoppingCart, Minus, Plus } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface ShoppingCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  perDay: string;
  items: {
    id: string;
    name: string;
    note?: string;
  }[];
  calculateAmount: (days: number) => string;
}

const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  {
    id: 'protein',
    name: 'Protein',
    emoji: '🥩',
    description: 'Wähle nach Vorliebe - alle austauschbar',
    perDay: '~400g (Mittag + Abend)',
    items: [
      { id: 'chicken', name: 'Hähnchenbrust' },
      { id: 'turkey', name: 'Putenbrust' },
      { id: 'beef', name: 'Rinderhack 5%' },
      { id: 'fish', name: 'Weißfisch (Kabeljau, Pangasius)' },
      { id: 'shrimp', name: 'Garnelen' },
      { id: 'tuna', name: 'Thunfisch (Dose)', note: '1 Dose = 1 Portion' },
      { id: 'pork', name: 'Schweinefilet' },
    ],
    calculateAmount: (days) => `~${(days * 0.4).toFixed(1)}kg gesamt`,
  },
  {
    id: 'eggs',
    name: 'Eier',
    emoji: '🥚',
    description: '3 Eier pro Tag zum Frühstück',
    perDay: '3 Stück',
    items: [
      { id: 'eggs', name: 'Eier (L)' },
    ],
    calculateAmount: (days) => `${days * 3} Stück (${Math.ceil(days * 3 / 10)} Packungen à 10)`,
  },
  {
    id: 'carbs',
    name: 'Kohlenhydrate',
    emoji: '🍚',
    description: 'Mix nach Vorliebe für Frühstück + Mittag',
    perDay: '~300g Kartoffeln ODER ~60g Reis/Nudeln + Frühstücks-Carbs',
    items: [
      { id: 'potatoes', name: 'Kartoffeln' },
      { id: 'sweet-potatoes', name: 'Süßkartoffeln' },
      { id: 'rice', name: 'Reis' },
      { id: 'pasta', name: 'Nudeln' },
      { id: 'oats', name: 'Haferflocken', note: '80g pro Tag' },
      { id: 'bread', name: 'Toast / Sandwiches', note: '3 Stück pro Tag' },
    ],
    calculateAmount: (days) => `Kartoffeln: ~${(days * 0.3).toFixed(1)}kg ODER Reis/Nudeln: ~${(days * 60)}g`,
  },
  {
    id: 'dairy',
    name: 'Milchprodukte',
    emoji: '🥛',
    description: 'Für Snack + Frühstück',
    perDay: '~200g Skyr/Quark + 30g Exquisa',
    items: [
      { id: 'skyr', name: 'Skyr' },
      { id: 'quark', name: 'Magerquark' },
      { id: 'cottage', name: 'Körniger Frischkäse' },
      { id: 'exquisa', name: 'Exquisa 0,2%' },
      { id: 'whey', name: 'Whey Protein', note: '25-30g pro Portion' },
    ],
    calculateAmount: (days) => `Skyr/Quark: ~${(days * 0.2).toFixed(1)}kg, Exquisa: 1 Pack`,
  },
  {
    id: 'frozen',
    name: 'Tiefkühl',
    emoji: '❄️',
    description: 'Convenience für schnelle Mahlzeiten',
    perDay: '1 Gemüsepfanne, ½ an Tag B',
    items: [
      { id: 'iglo', name: 'Iglo Schlemmer-Filet', note: 'Nur Tag A' },
      { id: 'frosta', name: 'Frosta Gemüsepfanne 480g' },
    ],
    calculateAmount: (days) => {
      const iglo = Math.ceil(days / 2);
      const frosta = Math.ceil(days * 0.75);
      return `Iglo: ${iglo} Stück, Frosta: ${frosta} Packungen`;
    },
  },
  {
    id: 'meat-products',
    name: 'Fleischwaren',
    emoji: '🥓',
    description: 'Fürs Frühstück',
    perDay: '2 Scheiben',
    items: [
      { id: 'ham', name: 'Backschinken' },
    ],
    calculateAmount: (days) => `${Math.ceil(days / 5)} Packung(en)`,
  },
];

export default function ShoppingPage() {
  const [days, setDays] = useState(7);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(SHOPPING_CATEGORIES.map(c => c.id))
  );

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = SHOPPING_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = checkedItems.size;

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <p className="text-zinc-500 text-sm">Basierend auf deinem Ernährungsplan</p>
        <h1 className="text-xl font-semibold tracking-tight">Einkaufsliste</h1>
      </div>

      {/* Days Selector */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Für wie viele Tage?</p>
            <p className="text-sm text-zinc-500">Mengen werden berechnet</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDays(d => Math.max(1, d - 1))}
              className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            >
              <Minus size={18} />
            </button>
            <span className="text-2xl font-semibold w-12 text-center">{days}</span>
            <button
              onClick={() => setDays(d => Math.min(14, d + 1))}
              className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </Card>

      {/* Progress */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-zinc-400" size={20} />
            <span className="text-sm text-zinc-400">Fortschritt</span>
          </div>
          <span className="text-sm font-medium">{checkedCount}/{totalItems}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-white transition-all duration-300 rounded-full"
            style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {/* Categories */}
      <div className="space-y-4">
        {SHOPPING_CATEGORIES.map(category => (
          <Card key={category.id}>
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.emoji}</span>
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-xs text-zinc-500">{category.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-500">
                    {category.calculateAmount(days)}
                  </p>
                  <p className="text-xs text-zinc-600">{category.perDay}</p>
                </div>
              </div>
            </button>

            {/* Items */}
            {expandedCategories.has(category.id) && (
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                {category.items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                      checkedItems.has(item.id)
                        ? 'bg-emerald-500/10'
                        : 'bg-zinc-800/50 hover:bg-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        checkedItems.has(item.id)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-transparent border-zinc-700'
                      }`}
                    >
                      {checkedItems.has(item.id) && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm ${
                          checkedItems.has(item.id) ? 'text-zinc-500 line-through' : ''
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.note && (
                        <span className="text-xs text-zinc-600 ml-2">({item.note})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card className="mt-6 bg-zinc-800/50 border-zinc-700">
        <p className="text-sm text-zinc-300">
          <strong>Tipp:</strong> Die Proteinquellen sind austauschbar. Kaufe was frisch ist oder im Angebot.
          200g Hähnchen ≈ 225g Garnelen ≈ 275g Weißfisch ≈ 175g Rinderhack.
        </p>
      </Card>
    </div>
  );
}
