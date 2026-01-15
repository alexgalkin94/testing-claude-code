'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronDown, ChevronUp, GripVertical, X, Check, Sunrise, Sun, Sunset, Cookie } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useData } from '@/lib/data-store';
import {
  MealPlan,
  Meal,
  MealItem,
  createEmptyPlan,
  createEmptyMeal,
  createEmptyItem,
  clonePlan,
  getPlanTotals,
  getMealTotals,
  getItemTotals,
  getEffectiveItem,
} from '@/lib/mealPlan';

const MealIcon = ({ icon, size = 16 }: { icon: string; size?: number }) => {
  switch (icon) {
    case 'sunrise': return <Sunrise size={size} />;
    case 'sun': return <Sun size={size} />;
    case 'sunset': return <Sunset size={size} />;
    case 'cookie': return <Cookie size={size} />;
    default: return <Sun size={size} />;
  }
};

export default function PlansPage() {
  const router = useRouter();
  const { data, createPlan, updatePlan, deletePlan } = useData();
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const plans = Object.values(data.mealPlans);

  const handleEditPlan = (plan: MealPlan) => {
    setEditingPlanId(plan.id);
    setEditingPlan(clonePlan(plan));
    // Expand all meals by default when editing
    setExpandedMeals(new Set(plan.meals.map(m => m.id)));
  };

  const handleCreatePlan = () => {
    const newPlan = createEmptyPlan('Neuer Plan');
    setEditingPlanId(newPlan.id);
    setEditingPlan(newPlan);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;

    if (editingPlanId && data.mealPlans[editingPlanId]) {
      updatePlan(editingPlan);
    } else {
      createPlan(editingPlan);
    }

    setEditingPlanId(null);
    setEditingPlan(null);
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditingPlan(null);
  };

  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) {
      alert('Du musst mindestens einen Plan behalten.');
      return;
    }
    if (confirm('Willst du diesen Plan wirklich löschen?')) {
      deletePlan(planId);
    }
  };

  // Plan editing helpers
  const updatePlanName = (name: string) => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, name });
  };

  const addMeal = () => {
    if (!editingPlan) return;
    const newMeal = createEmptyMeal();
    setEditingPlan({
      ...editingPlan,
      meals: [...editingPlan.meals, newMeal],
    });
    setExpandedMeals(prev => new Set([...prev, newMeal.id]));
  };

  const updateMeal = (mealId: string, updates: Partial<Meal>) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId ? { ...m, ...updates } : m
      ),
    });
  };

  const deleteMeal = (mealId: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.filter(m => m.id !== mealId),
    });
  };

  const addItem = (mealId: string) => {
    if (!editingPlan) return;
    const newItem = createEmptyItem();
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId
          ? { ...m, items: [...m.items, newItem] }
          : m
      ),
    });
    setExpandedItems(prev => new Set([...prev, newItem.id]));
  };

  const updateItem = (mealId: string, itemId: string, updates: Partial<MealItem>) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map(i =>
                i.id === itemId ? { ...i, ...updates } : i
              ),
            }
          : m
      ),
    });
  };

  const deleteItem = (mealId: string, itemId: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId
          ? { ...m, items: m.items.filter(i => i.id !== itemId) }
          : m
      ),
    });
  };

  const addAlternative = (mealId: string, itemId: string) => {
    if (!editingPlan) return;
    const newAlt = createEmptyItem('Alternative');
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map(i =>
                i.id === itemId
                  ? { ...i, alternatives: [...(i.alternatives || []), newAlt] }
                  : i
              ),
            }
          : m
      ),
    });
  };

  const updateAlternative = (mealId: string, itemId: string, altId: string, updates: Partial<MealItem>) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map(i =>
                i.id === itemId
                  ? {
                      ...i,
                      alternatives: i.alternatives?.map(a =>
                        a.id === altId ? { ...a, ...updates } : a
                      ),
                    }
                  : i
              ),
            }
          : m
      ),
    });
  };

  const deleteAlternative = (mealId: string, itemId: string, altId: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map(i =>
                i.id === itemId
                  ? { ...i, alternatives: i.alternatives?.filter(a => a.id !== altId) }
                  : i
              ),
            }
          : m
      ),
    });
  };

  const toggleMealExpanded = (mealId: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // If editing a plan, show the editor
  if (editingPlan) {
    const planTotals = getPlanTotals(editingPlan);

    return (
      <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCancelEdit}
            className="p-2 -ml-2 text-zinc-400 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-zinc-500 text-sm">Plan bearbeiten</p>
            <input
              type="text"
              value={editingPlan.name}
              onChange={(e) => updatePlanName(e.target.value)}
              className="text-xl font-semibold tracking-tight bg-transparent border-none outline-none w-full"
              placeholder="Plan Name"
            />
          </div>
          <Button onClick={handleSavePlan} size="sm">
            <Check size={16} className="mr-1" /> Speichern
          </Button>
        </div>

        {/* Plan Summary */}
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-500 uppercase">Kalorien</p>
              <p className="text-lg font-semibold">{planTotals.calories}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-500/70 uppercase">Protein</p>
              <p className="text-lg font-semibold">{planTotals.protein}g</p>
            </div>
            <div>
              <p className="text-xs text-blue-400/70 uppercase">Carbs</p>
              <p className="text-lg font-semibold">{planTotals.carbs}g</p>
            </div>
            <div>
              <p className="text-xs text-orange-400/70 uppercase">Fett</p>
              <p className="text-lg font-semibold">{planTotals.fat}g</p>
            </div>
          </div>
        </Card>

        {/* Meals */}
        <div className="space-y-4">
          {editingPlan.meals.map((meal) => {
            const mealTotals = getMealTotals(meal);
            const isExpanded = expandedMeals.has(meal.id);

            return (
              <Card key={meal.id} className="p-0 overflow-hidden">
                {/* Meal Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/50"
                  onClick={() => toggleMealExpanded(meal.id)}
                >
                  <div className="text-zinc-400">
                    <MealIcon icon={meal.icon} />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateMeal(meal.id, { name: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium bg-transparent border-none outline-none w-full"
                      placeholder="Mahlzeit Name"
                    />
                    <p className="text-xs text-zinc-500">
                      {mealTotals.calories} kcal · {mealTotals.protein}g P
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMeal(meal.id);
                    }}
                    className="p-2 text-zinc-600 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {/* Meal Items */}
                {isExpanded && (
                  <div className="border-t border-zinc-800">
                    {/* Icon & Time Selection */}
                    <div className="flex items-center gap-4 p-4 border-b border-zinc-800/50">
                      <div className="flex gap-2">
                        {(['sunrise', 'sun', 'sunset', 'cookie'] as const).map((icon) => (
                          <button
                            key={icon}
                            onClick={() => updateMeal(meal.id, { icon })}
                            className={`p-2 rounded ${
                              meal.icon === icon
                                ? 'bg-white text-black'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <MealIcon icon={icon} size={14} />
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={meal.time}
                        onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
                        placeholder="Zeit (z.B. 12:00)"
                        className="flex-1 bg-zinc-800 rounded px-3 py-2 text-sm"
                      />
                    </div>

                    {/* Items List */}
                    <div className="p-4 space-y-3">
                      {meal.items.map((item) => {
                        const itemTotals = getItemTotals(item);
                        const isItemExpanded = expandedItems.has(item.id);

                        return (
                          <div
                            key={item.id}
                            className="bg-zinc-800/50 rounded-lg overflow-hidden"
                          >
                            {/* Item Header */}
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer"
                              onClick={() => toggleItemExpanded(item.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {item.alternatives?.length
                                      ? (item.groupName || 'Optionen')
                                      : `${item.quantity}${item.unit === 'g' || item.unit === 'ml' ? item.unit : '× '} ${item.name}`
                                    }
                                  </span>
                                  {item.alternatives?.length ? (
                                    <span className="text-xs text-zinc-600">({item.alternatives.length + 1} Optionen)</span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-zinc-500">
                                  {itemTotals.calories} kcal · {itemTotals.protein}g P · {itemTotals.carbs}g C · {itemTotals.fat}g F
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteItem(meal.id, item.id);
                                }}
                                className="p-1.5 text-zinc-600 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                              {isItemExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>

                            {/* Item Edit Form */}
                            {isItemExpanded && (
                              <div className="p-3 pt-0 space-y-3 border-t border-zinc-700/50">
                                {/* If no alternatives, show simple form */}
                                {(!item.alternatives || item.alternatives.length === 0) ? (
                                  <>
                                    <div className="grid grid-cols-2 gap-3">
                                      <Input
                                        label="Name"
                                        value={item.name}
                                        onChange={(v) => updateItem(meal.id, item.id, { name: v })}
                                        placeholder="z.B. Eier"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          label="Menge"
                                          type="number"
                                          value={item.quantity.toString()}
                                          onChange={(v) => updateItem(meal.id, item.id, { quantity: parseFloat(v) || 0 })}
                                        />
                                        <div>
                                          <label className="block text-xs text-zinc-500 mb-1">Einheit</label>
                                          <select
                                            value={item.unit}
                                            onChange={(e) => updateItem(meal.id, item.id, { unit: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                                          >
                                            <option value="g">g</option>
                                            <option value="ml">ml</option>
                                            <option value="Stück">Stück</option>
                                            <option value="Portion">Portion</option>
                                            <option value="Scheiben">Scheiben</option>
                                            <option value="EL">EL</option>
                                            <option value="TL">TL</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium mt-2">
                                      Nährwerte pro {item.unit === 'g' ? '100g' : item.unit === 'ml' ? '100ml' : 'Einheit'}:
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                      <Input
                                        label="kcal"
                                        type="number"
                                        value={item.caloriesPer.toString()}
                                        onChange={(v) => updateItem(meal.id, item.id, { caloriesPer: parseFloat(v) || 0 })}
                                      />
                                      <Input
                                        label="Protein"
                                        type="number"
                                        value={item.proteinPer.toString()}
                                        onChange={(v) => updateItem(meal.id, item.id, { proteinPer: parseFloat(v) || 0 })}
                                      />
                                      <Input
                                        label="Carbs"
                                        type="number"
                                        value={item.carbsPer.toString()}
                                        onChange={(v) => updateItem(meal.id, item.id, { carbsPer: parseFloat(v) || 0 })}
                                      />
                                      <Input
                                        label="Fett"
                                        type="number"
                                        value={item.fatPer.toString()}
                                        onChange={(v) => updateItem(meal.id, item.id, { fatPer: parseFloat(v) || 0 })}
                                      />
                                    </div>
                                    <div className="bg-zinc-900 rounded p-2 text-xs text-zinc-400">
                                      Gesamt: {itemTotals.calories} kcal · {itemTotals.protein}g P · {itemTotals.carbs}g C · {itemTotals.fat}g F
                                    </div>
                                  </>
                                ) : (
                                  /* With alternatives: show group name + all options */
                                  <div className="space-y-3">
                                    {/* Group name */}
                                    <Input
                                      label="Gruppenname"
                                      value={item.groupName || ''}
                                      onChange={(v) => updateItem(meal.id, item.id, { groupName: v })}
                                      placeholder="z.B. Beilage, Protein, Kohlenhydrate"
                                    />

                                    {/* Option 1 (main item) */}
                                    <div className="bg-zinc-900/50 rounded-lg p-3 space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500 font-medium">Option 1</span>
                                        <input
                                          type="text"
                                          value={item.name}
                                          onChange={(e) => updateItem(meal.id, item.id, { name: e.target.value })}
                                          className="flex-1 text-sm font-medium bg-transparent border-none outline-none"
                                          placeholder="Name"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          label="Menge"
                                          type="number"
                                          value={item.quantity.toString()}
                                          onChange={(v) => updateItem(meal.id, item.id, { quantity: parseFloat(v) || 0 })}
                                        />
                                        <div>
                                          <label className="block text-xs text-zinc-500 mb-1">Einheit</label>
                                          <select
                                            value={item.unit}
                                            onChange={(e) => updateItem(meal.id, item.id, { unit: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                                          >
                                            <option value="g">g</option>
                                            <option value="ml">ml</option>
                                            <option value="Stück">Stück</option>
                                            <option value="Portion">Portion</option>
                                            <option value="Scheiben">Scheiben</option>
                                            <option value="EL">EL</option>
                                            <option value="TL">TL</option>
                                          </select>
                                        </div>
                                      </div>
                                      <p className="text-xs text-zinc-500 font-medium">
                                        Nährwerte pro {item.unit === 'g' ? '100g' : item.unit === 'ml' ? '100ml' : 'Einheit'}:
                                      </p>
                                      <div className="grid grid-cols-4 gap-2">
                                        <Input
                                          label="kcal"
                                          type="number"
                                          value={item.caloriesPer.toString()}
                                          onChange={(v) => updateItem(meal.id, item.id, { caloriesPer: parseFloat(v) || 0 })}
                                        />
                                        <Input
                                          label="Protein"
                                          type="number"
                                          value={item.proteinPer.toString()}
                                          onChange={(v) => updateItem(meal.id, item.id, { proteinPer: parseFloat(v) || 0 })}
                                        />
                                        <Input
                                          label="Carbs"
                                          type="number"
                                          value={item.carbsPer.toString()}
                                          onChange={(v) => updateItem(meal.id, item.id, { carbsPer: parseFloat(v) || 0 })}
                                        />
                                        <Input
                                          label="Fett"
                                          type="number"
                                          value={item.fatPer.toString()}
                                          onChange={(v) => updateItem(meal.id, item.id, { fatPer: parseFloat(v) || 0 })}
                                        />
                                      </div>
                                      <div className="bg-zinc-900 rounded p-2 text-xs text-zinc-400">
                                        Gesamt: {itemTotals.calories} kcal · {itemTotals.protein}g P · {itemTotals.carbs}g C · {itemTotals.fat}g F
                                      </div>
                                    </div>

                                    {/* Other options */}
                                    {item.alternatives.map((alt, index) => {
                                      const altTotals = getItemTotals(alt);
                                      return (
                                        <div key={alt.id} className="bg-zinc-900/50 rounded-lg p-3 space-y-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-500 font-medium">Option {index + 2}</span>
                                            <input
                                              type="text"
                                              value={alt.name}
                                              onChange={(e) => updateAlternative(meal.id, item.id, alt.id, { name: e.target.value })}
                                              className="flex-1 text-sm font-medium bg-transparent border-none outline-none"
                                              placeholder="Name"
                                            />
                                            <button
                                              onClick={() => deleteAlternative(meal.id, item.id, alt.id)}
                                              className="p-1 text-zinc-600 hover:text-red-500"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              label="Menge"
                                              type="number"
                                              value={alt.quantity.toString()}
                                              onChange={(v) => updateAlternative(meal.id, item.id, alt.id, { quantity: parseFloat(v) || 0 })}
                                            />
                                            <div>
                                              <label className="block text-xs text-zinc-500 mb-1">Einheit</label>
                                              <select
                                                value={alt.unit}
                                                onChange={(e) => updateAlternative(meal.id, item.id, alt.id, { unit: e.target.value })}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                                              >
                                                <option value="g">g</option>
                                                <option value="ml">ml</option>
                                                <option value="Stück">Stück</option>
                                                <option value="Portion">Portion</option>
                                                <option value="Scheiben">Scheiben</option>
                                                <option value="EL">EL</option>
                                                <option value="TL">TL</option>
                                              </select>
                                            </div>
                                          </div>
                                          <p className="text-xs text-zinc-500 font-medium">
                                            Nährwerte pro {alt.unit === 'g' ? '100g' : alt.unit === 'ml' ? '100ml' : 'Einheit'}:
                                          </p>
                                          <div className="grid grid-cols-4 gap-2">
                                            <Input
                                              label="kcal"
                                              type="number"
                                              value={alt.caloriesPer.toString()}
                                              onChange={(v) => updateAlternative(meal.id, item.id, alt.id, { caloriesPer: parseFloat(v) || 0 })}
                                            />
                                            <Input
                                              label="Protein"
                                              type="number"
                                              value={alt.proteinPer.toString()}
                                              onChange={(v) => updateAlternative(meal.id, item.id, alt.id, { proteinPer: parseFloat(v) || 0 })}
                                            />
                                            <Input
                                              label="Carbs"
                                              type="number"
                                              value={alt.carbsPer.toString()}
                                              onChange={(v) => updateAlternative(meal.id, item.id, alt.id, { carbsPer: parseFloat(v) || 0 })}
                                            />
                                            <Input
                                              label="Fett"
                                              type="number"
                                              value={alt.fatPer.toString()}
                                              onChange={(v) => updateAlternative(meal.id, item.id, alt.id, { fatPer: parseFloat(v) || 0 })}
                                            />
                                          </div>
                                          <div className="bg-zinc-900 rounded p-2 text-xs text-zinc-400">
                                            Gesamt: {altTotals.calories} kcal · {altTotals.protein}g P · {altTotals.carbs}g C · {altTotals.fat}g F
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <button
                                  onClick={() => addAlternative(meal.id, item.id)}
                                  className="w-full mt-2 py-1.5 px-3 rounded border border-dashed border-zinc-700 text-zinc-500 hover:border-amber-500/50 hover:text-amber-500/70 text-xs flex items-center justify-center gap-1"
                                >
                                  <Plus size={12} /> {item.alternatives?.length ? 'Weitere Option' : 'Alternative hinzufügen'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Item Button */}
                      <button
                        onClick={() => addItem(meal.id)}
                        className="w-full py-2 px-4 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Item hinzufügen
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Add Meal Button */}
          <button
            onClick={addMeal}
            className="w-full py-4 px-4 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Mahlzeit hinzufügen
          </button>
        </div>
      </div>
    );
  }

  // Plan list view
  return (
    <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-zinc-500 text-sm">Verwalte deine</p>
          <h1 className="text-xl font-semibold tracking-tight">Ernährungspläne</h1>
        </div>
        <Button onClick={handleCreatePlan} size="sm">
          <Plus size={16} className="mr-1" /> Neuer Plan
        </Button>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const totals = getPlanTotals(plan);
          const mealsCount = plan.meals.length;
          const itemsCount = plan.meals.reduce((sum, m) => sum + m.items.length, 0);

          return (
            <Card key={plan.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {mealsCount} Mahlzeiten · {itemsCount} Items
                  </p>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-zinc-400">{totals.calories} kcal</span>
                    <span className="text-emerald-500/70">{totals.protein}g P</span>
                    <span className="text-blue-400/70">{totals.carbs}g C</span>
                    <span className="text-orange-400/70">{totals.fat}g F</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-zinc-500 mb-4">Noch keine Pläne vorhanden.</p>
          <Button onClick={handleCreatePlan}>
            <Plus size={16} className="mr-1" /> Ersten Plan erstellen
          </Button>
        </Card>
      )}
    </div>
  );
}
