'use client';

import { useMemo, useEffect } from 'react';
import { Check, Minus, Plus, RotateCcw, ChevronDown, ChevronUp, Home } from 'lucide-react';
import Card from '@/components/Card';
import { useData } from '@/lib/data-store';
import { getItemTotals } from '@/lib/mealPlan';
import { useState } from 'react';

interface AlternativeOption {
  name: string;
  quantity: number;
  unit: string;
}

interface AggregatedItem {
  id: string;
  name: string;
  totalQuantity: number;
  unit: string;
  sources: { planName: string; totalQty: number; perDay: number; unit: string }[];
  hasAlternatives: boolean;
  alternatives: AlternativeOption[];
}

const EXCLUDED_ITEMS = ['omega-3', 'omega3', 'supplement', 'vitamin', 'algenöl'];

function formatQuantity(qty: number, unit: string): string {
  if (unit === 'g' && qty >= 1000) {
    return `${(qty / 1000).toFixed(1).replace('.0', '')}kg`;
  }
  if (unit === 'ml' && qty >= 1000) {
    return `${(qty / 1000).toFixed(1).replace('.0', '')}L`;
  }
  if (unit === 'Stück' || unit === 'Portion') {
    return `${qty}×`;
  }
  return `${qty}${unit}`;
}

export default function ShoppingPage() {
  const {
    data,
    setShoppingPlanDays,
    setShoppingAtHome,
    toggleShoppingItem,
    resetShopping,
  } = useData();

  const plans = Object.values(data.mealPlans);
  const shopping = data.shopping || { planDays: {}, atHome: {}, checkedItems: [] };
  const planDays = shopping.planDays || {};
  const atHome = shopping.atHome || {};
  const checkedItems = new Set(shopping.checkedItems || []);

  const [showAtHome, setShowAtHome] = useState(false);

  // Initialize planDays for any new plans
  useEffect(() => {
    for (const p of plans) {
      if (!(p.id in planDays)) {
        setShoppingPlanDays(p.id, 0);
      }
    }
  }, [plans.length]);

  const totalDays = Object.values(planDays).reduce((a, b) => a + b, 0);

  const aggregatedItems = useMemo(() => {
    const itemMap = new Map<string, AggregatedItem>();

    for (const plan of plans) {
      const days = planDays[plan.id] || 0;
      if (days === 0) continue;

      for (const meal of plan.meals) {
        for (const item of meal.items) {
          const nameLower = item.name.toLowerCase();
          if (EXCLUDED_ITEMS.some(ex => nameLower.includes(ex))) continue;

          const hasAlts = item.alternatives && item.alternatives.length > 0;
          const key = hasAlts
            ? (item.groupName || item.name).toLowerCase()
            : nameLower;
          const existing = itemMap.get(key);

          const alternatives: AlternativeOption[] = [];
          if (hasAlts && item.alternatives) {
            alternatives.push({
              name: item.name,
              quantity: item.quantity * days,
              unit: item.unit,
            });
            for (const alt of item.alternatives) {
              alternatives.push({
                name: alt.name,
                quantity: alt.quantity * days,
                unit: alt.unit,
              });
            }
          }

          if (existing) {
            existing.totalQuantity += item.quantity * days;
            const existingSource = existing.sources.find(s => s.planName === plan.name);
            if (existingSource) {
              existingSource.totalQty += item.quantity * days;
              existingSource.perDay += item.quantity;
            } else {
              existing.sources.push({
                planName: plan.name,
                totalQty: item.quantity * days,
                perDay: item.quantity,
                unit: item.unit,
              });
            }
            if (hasAlts && existing.alternatives.length > 0) {
              for (const alt of alternatives) {
                const existingAlt = existing.alternatives.find(
                  a => a.name.toLowerCase() === alt.name.toLowerCase()
                );
                if (existingAlt) {
                  existingAlt.quantity += alt.quantity;
                } else {
                  existing.alternatives.push(alt);
                }
              }
            }
          } else {
            const displayName = item.groupName || item.name;
            itemMap.set(key, {
              id: key,
              name: displayName,
              totalQuantity: item.quantity * days,
              unit: item.unit,
              sources: [{
                planName: plan.name,
                totalQty: item.quantity * days,
                perDay: item.quantity,
                unit: item.unit,
              }],
              hasAlternatives: hasAlts || false,
              alternatives,
            });
          }
        }
      }
    }

    return Array.from(itemMap.values()).sort((a, b) => {
      if (a.hasAlternatives && !b.hasAlternatives) return -1;
      if (!a.hasAlternatives && b.hasAlternatives) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [plans, planDays]);

  const shoppingList = useMemo(() => {
    return aggregatedItems.map(item => {
      const homeQty = atHome[item.id] || 0;
      const needed = Math.max(0, item.totalQuantity - homeQty);
      return { ...item, needed, homeQty };
    }).filter(item => item.needed > 0);
  }, [aggregatedItems, atHome]);

  const totalCalories = useMemo(() => {
    let total = 0;
    for (const plan of plans) {
      const days = planDays[plan.id] || 0;
      if (days === 0) continue;
      for (const meal of plan.meals) {
        for (const item of meal.items) {
          const itemTotal = getItemTotals(item);
          total += itemTotal.calories * days;
        }
      }
    }
    return total;
  }, [plans, planDays]);

  const checkedCount = shoppingList.filter(i => checkedItems.has(i.id)).length;

  return (
    <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-zinc-500 text-sm">Dynamische</p>
          <h1 className="text-xl font-semibold tracking-tight">Einkaufsliste</h1>
        </div>
        {(totalDays > 0 || checkedItems.size > 0 || Object.values(atHome).some(v => v > 0)) && (
          <button
            onClick={resetShopping}
            className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800"
            title="Liste zurücksetzen"
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      <Card className="mb-4">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
          Einkaufen für...
        </h2>
        {/* Apple HIG: 44pt min row height */}
        <div className="space-y-1">
          {plans.map(plan => {
            const days = planDays[plan.id] || 0;
            return (
              <div key={plan.id} className="flex items-center justify-between min-h-[44px] py-2">
                <span className="text-[17px] font-medium truncate flex-1 mr-4">{plan.name}</span>
                <div className="flex items-center gap-1">
                  {/* Apple HIG: 44pt touch target */}
                  <button
                    onClick={() => setShoppingPlanDays(plan.id, Math.max(0, days - 1))}
                    className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center active:scale-95 transition-transform"
                    disabled={days === 0}
                  >
                    <Minus size={18} className={days === 0 ? 'text-zinc-600' : ''} />
                  </button>
                  <span className="w-12 text-center text-[17px] font-mono">
                    {days > 0 ? `${days}×` : '–'}
                  </span>
                  <button
                    onClick={() => setShoppingPlanDays(plan.id, Math.min(14, days + 1))}
                    className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totalDays > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-sm">
            <span className="text-zinc-400">Gesamt</span>
            <span className="font-medium">{totalDays} Tage · ~{totalCalories.toLocaleString()} kcal</span>
          </div>
        )}
      </Card>

      {aggregatedItems.length > 0 && (
        <Card className="mb-4">
          <button
            onClick={() => setShowAtHome(!showAtHome)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Home size={16} className="text-zinc-500" />
              <span className="text-sm font-medium text-zinc-400">Schon zuhause?</span>
              {Object.values(atHome).filter(v => v > 0).length > 0 && (
                <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500">
                  {Object.values(atHome).filter(v => v > 0).length} Items
                </span>
              )}
            </div>
            {showAtHome ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
          </button>

          {showAtHome && (
            <div className="mt-4 space-y-1">
              <p className="text-[13px] text-zinc-500 mb-3">
                Gib an was du schon hast – wird von der Einkaufsliste abgezogen
              </p>
              {aggregatedItems.filter(item => !item.hasAlternatives).map(item => {
                const homeQty = atHome[item.id] || 0;
                const step = item.unit === 'g' || item.unit === 'ml' ? 50 : 1;
                return (
                  <div key={item.id} className="flex items-center justify-between min-h-[44px] py-2">
                    <span className="text-[15px] text-zinc-300 truncate flex-1 mr-4">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShoppingAtHome(item.id, Math.max(0, homeQty - step))}
                        className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center active:scale-95 transition-transform"
                        disabled={homeQty === 0}
                      >
                        <Minus size={16} className={homeQty === 0 ? 'text-zinc-600' : ''} />
                      </button>
                      <span className="w-16 text-center text-[15px] font-mono">
                        {homeQty > 0 ? formatQuantity(homeQty, item.unit) : '–'}
                      </span>
                      <button
                        onClick={() => setShoppingAtHome(item.id, homeQty + step)}
                        className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {shoppingList.length > 0 && checkedCount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-500">{checkedCount} von {shoppingList.length}</span>
            {checkedCount === shoppingList.length && <span className="text-emerald-500">Fertig!</span>}
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(checkedCount / shoppingList.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {shoppingList.length > 0 ? (
        <Card>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
            Einkaufsliste ({shoppingList.length} Items)
          </h2>
          {/* Apple HIG: 44pt min row height, 24pt checkbox */}
          <div className="space-y-1">
            {shoppingList.map(item => {
              const isChecked = checkedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItem(item.id)}
                  className={`flex items-start gap-4 p-4 -mx-1 rounded-xl cursor-pointer transition-all min-h-[44px] ${
                    isChecked ? 'bg-emerald-500/5' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className={`w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                  }`}>
                    {isChecked && <Check size={16} className="text-white" strokeWidth={2.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-[17px] font-medium ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                        {item.name}
                      </span>
                      {!item.hasAlternatives && (
                        <span className={`font-mono text-[15px] flex-shrink-0 ${
                          isChecked ? 'text-zinc-600' : 'text-emerald-500'
                        }`}>
                          {formatQuantity(item.needed, item.unit)}
                        </span>
                      )}
                    </div>

                    {item.hasAlternatives && item.alternatives.length > 0 && !isChecked ? (
                      <p className="text-[15px] text-zinc-400 mt-1">
                        {item.alternatives.map((alt, idx) => (
                          <span key={alt.name}>
                            {idx > 0 && <span className="text-zinc-600"> oder </span>}
                            <span className="text-emerald-500/80">{formatQuantity(alt.quantity, alt.unit)}</span>
                            <span className="text-zinc-400"> {alt.name}</span>
                          </span>
                        ))}
                      </p>
                    ) : item.hasAlternatives && isChecked ? (
                      <p className="text-[13px] text-zinc-600">
                        {item.alternatives.map(a => a.name).join(' / ')}
                      </p>
                    ) : (
                      <>
                        <p className={`text-[13px] ${isChecked ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          {formatQuantity(item.needed, item.unit).replace('×', ' Stück')} benötigt
                          {item.homeQty > 0 && ` (${formatQuantity(item.homeQty, item.unit)} zuhause)`}
                        </p>
                        {!isChecked && item.sources.length > 0 && (
                          <p className="text-[13px] text-zinc-600 mt-1">
                            {item.sources.map(s =>
                              `${formatQuantity(s.perDay, s.unit)}/Tag ${s.planName}`
                            ).join(' · ')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : totalDays === 0 ? (
        <Card className="text-center py-8">
          <p className="text-zinc-500 mb-2">Wähle oben aus für wie viele Tage du einkaufen willst</p>
          <p className="text-xs text-zinc-600">Die Einkaufsliste wird automatisch aus deinen Plänen generiert</p>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <p className="text-zinc-500">Keine Items zum Einkaufen</p>
        </Card>
      )}
    </div>
  );
}
