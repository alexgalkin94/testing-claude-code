'use client';

import { useState } from 'react';
import { Check, Minus, Plus, RotateCcw } from 'lucide-react';
import Card from '@/components/Card';

export default function ShoppingPage() {
  const [days, setDays] = useState(7);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetList = () => setCheckedItems(new Set());

  // Calculations based on days
  const calc = {
    proteinKg: (days * 0.4).toFixed(1), // ~400g/day total
    eggs: days * 3,
    eggPacks: Math.ceil((days * 3) / 10),
    dairyG: days * 200,
    dairyPacks: Math.ceil((days * 200) / 450), // Skyr is 450g
    exquisaPacks: Math.ceil((days * 30) / 200),
    hamPacks: Math.ceil((days * 2) / 10), // ~10 Scheiben pro Pack
    potatoKg: (days * 0.3).toFixed(1),
    potatoPacks: Math.ceil((days * 0.3) / 2), // 2kg Sack
    toastSlices: days * 3,
    toastPacks: Math.ceil((days * 3) / 10), // ~10 pro Packung
    iglo: Math.ceil(days / 2),
    frosta: Math.ceil(days * 0.8),
  };

  // Fresh items - buy every week
  const freshItems = [
    {
      id: 'protein',
      name: 'Protein',
      amount: `~${calc.proteinKg}kg`,
      note: 'Mix was frisch/günstig ist',
      sub: 'Hähnchen 400g/600g • Hack 400g • Pute • Fisch',
    },
    {
      id: 'eggs',
      name: 'Eier',
      amount: `${calc.eggPacks}× 10er`,
      note: `${calc.eggs} Stück (3/Tag)`,
    },
    {
      id: 'dairy',
      name: 'Skyr / Magerquark',
      amount: `${calc.dairyPacks}× Becher`,
      note: `~${calc.dairyG}g für Abend-Snacks`,
    },
    {
      id: 'exquisa',
      name: 'Exquisa 0,2%',
      amount: `${calc.exquisaPacks}× Pack`,
      note: '30g/Tag fürs Rührei',
    },
    {
      id: 'ham',
      name: 'Backschinken',
      amount: `${calc.hamPacks}× Pack`,
      note: '2 Scheiben/Tag',
    },
    {
      id: 'potatoes',
      name: 'Kartoffeln',
      amount: `${calc.potatoPacks}× 2kg`,
      note: `~${calc.potatoKg}kg (oder Süßkartoffeln)`,
    },
    {
      id: 'toast',
      name: 'Toast / Sandwiches',
      amount: `${calc.toastPacks}× Pack`,
      note: `${calc.toastSlices} Stück (3/Tag)`,
    },
  ];

  // Frozen - lasts longer
  const frozenItems = [
    {
      id: 'iglo',
      name: 'Iglo Schlemmer-Filet',
      amount: `${calc.iglo}×`,
      note: 'Für Tag A Mittag',
    },
    {
      id: 'frosta',
      name: 'Frosta Gemüsepfanne',
      amount: `${calc.frosta}×`,
      note: 'Fürs Abendessen',
    },
  ];

  // Stock items - just check if you need more
  const stockItems = [
    { id: 'rice', name: 'Reis' },
    { id: 'pasta', name: 'Nudeln' },
    { id: 'oats', name: 'Haferflocken' },
  ];

  const mainItems = [...freshItems, ...frozenItems];
  const checkedMain = mainItems.filter(i => checkedItems.has(i.id)).length;

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
            <span className="text-zinc-500">{checkedMain} von {mainItems.length}</span>
            {checkedMain === mainItems.length && <span className="text-emerald-500">Fertig! ✓</span>}
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(checkedMain / mainItems.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Fresh Items */}
      <Card className="mb-4">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
          🛒 Frisch (diese Woche)
        </h2>
        <div className="space-y-1">
          {freshItems.map(item => {
            const isChecked = checkedItems.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-3 p-3 -mx-1 rounded-lg cursor-pointer transition-all ${
                  isChecked ? 'bg-emerald-500/5' : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
                }`}>
                  {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`font-medium ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                      {item.name}
                    </span>
                    <span className={`font-mono text-sm flex-shrink-0 ${
                      isChecked ? 'text-zinc-600' : 'text-emerald-500'
                    }`}>
                      {item.amount}
                    </span>
                  </div>
                  <p className={`text-xs ${isChecked ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    {item.note}
                  </p>
                  {item.sub && !isChecked && (
                    <p className="text-xs text-zinc-600 mt-1">{item.sub}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Frozen */}
      <Card className="mb-4">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
          ❄️ Tiefkühl
        </h2>
        <div className="space-y-1">
          {frozenItems.map(item => {
            const isChecked = checkedItems.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-3 p-3 -mx-1 rounded-lg cursor-pointer transition-all ${
                  isChecked ? 'bg-emerald-500/5' : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
                }`}>
                  {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`font-medium ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                      {item.name}
                    </span>
                    <span className={`font-mono text-sm ${
                      isChecked ? 'text-zinc-600' : 'text-emerald-500'
                    }`}>
                      {item.amount}
                    </span>
                  </div>
                  <p className={`text-xs ${isChecked ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    {item.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stock Check */}
      <Card className="bg-zinc-900/50">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
          📦 Vorrat - brauchst du noch?
        </h2>
        <div className="flex flex-wrap gap-2">
          {stockItems.map(item => {
            const isChecked = checkedItems.has(`stock-${item.id}`);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(`stock-${item.id}`)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isChecked
                    ? 'bg-emerald-500/20 text-emerald-400 line-through'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {isChecked ? '✓ ' : ''}{item.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Tap = hab ich noch / brauch ich nicht
        </p>
      </Card>
    </div>
  );
}
