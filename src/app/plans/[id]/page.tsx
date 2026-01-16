'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, ChevronLeft, ChevronDown, ChevronUp, X, Sunrise, Sun, Sunset, Cookie, Download, Trash2, GripVertical, Import, Check } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useData } from '@/lib/data-store';
import {
  MealPlan,
  Meal,
  MealItem,
  createEmptyPlan,
  createEmptyMeal,
  createEmptyItem,
  clonePlan,
  cloneMeal,
  getPlanTotals,
  getMealTotals,
  getItemTotals,
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

function SortableItem({ id, mealId, children }: { id: string; mealId: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { mealId, type: 'item' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex items-center px-1 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface SortableMealRenderProps {
  dragHandleProps: {
    ref: (node: HTMLElement | null) => void;
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  };
}

function SortableMeal({ id, children }: { id: string; children: (props: SortableMealRenderProps) => React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id, data: { type: 'meal' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50 z-50' : ''}
    >
      {children({
        dragHandleProps: {
          ref: setActivatorNodeRef,
          attributes,
          listeners,
        },
      })}
    </div>
  );
}


type ExportFormat = 'json' | 'table' | 'text';

function calcItemTotals(item: MealItem) {
  const divisor = (item.unit === 'g' || item.unit === 'ml') ? 100 : 1;
  return {
    kcal: Math.round(item.caloriesPer * item.quantity / divisor),
    protein: Math.round(item.proteinPer * item.quantity / divisor * 10) / 10,
    carbs: Math.round(item.carbsPer * item.quantity / divisor * 10) / 10,
    fat: Math.round(item.fatPer * item.quantity / divisor * 10) / 10,
  };
}

function exportPlan(plan: MealPlan, format: ExportFormat): string {
  let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
  for (const meal of plan.meals) {
    for (const item of meal.items) {
      const t = calcItemTotals(item);
      totalKcal += t.kcal;
      totalP += t.protein;
      totalC += t.carbs;
      totalF += t.fat;
    }
  }

  if (format === 'json') {
    const cleanPlan = {
      name: plan.name,
      totals: {
        kcal: totalKcal,
        protein: Math.round(totalP * 10) / 10,
        carbs: Math.round(totalC * 10) / 10,
        fat: Math.round(totalF * 10) / 10,
      },
      meals: plan.meals.map(meal => ({
        name: meal.name,
        time: meal.time,
        items: meal.items.map(item => {
          const t = calcItemTotals(item);
          return {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            kcal: t.kcal,
            protein: t.protein,
            carbs: t.carbs,
            fat: t.fat,
          };
        }),
      })),
    };
    return JSON.stringify(cleanPlan, null, 2);
  }

  if (format === 'table') {
    let output = `# ${plan.name}\n\n`;
    output += `**Gesamt:** ${totalKcal} kcal | ${Math.round(totalP)}g Protein | ${Math.round(totalC)}g Carbs | ${Math.round(totalF)}g Fett\n\n`;
    output += `| Mahlzeit | Item | kcal | Protein | Carbs | Fett |\n`;
    output += `|----------|------|------|---------|-------|------|\n`;
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        const t = calcItemTotals(item);
        output += `| ${meal.name} | ${item.quantity}${item.unit} ${item.name} | ${t.kcal} | ${t.protein}g | ${t.carbs}g | ${t.fat}g |\n`;
      }
    }
    return output;
  }

  let output = `${plan.name}\n${'='.repeat(plan.name.length)}\n`;
  output += `Gesamt: ${totalKcal} kcal, ${Math.round(totalP)}g P, ${Math.round(totalC)}g C, ${Math.round(totalF)}g F\n\n`;
  for (const meal of plan.meals) {
    output += `${meal.name}${meal.time ? ` (${meal.time})` : ''}:\n`;
    for (const item of meal.items) {
      const t = calcItemTotals(item);
      output += `  - ${item.quantity}${item.unit} ${item.name} (${t.kcal} kcal, ${t.protein}g P)\n`;
    }
    output += '\n';
  }
  return output.trim();
}

export default function PlanEditorPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const isNew = planId === 'new';

  const { data, createPlan, updatePlan, isSyncing, lastSyncError } = useData();
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'item' | 'meal' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deleteMealDialog, setDeleteMealDialog] = useState<{ open: boolean; mealId: string | null; mealName: string }>({ open: false, mealId: null, mealName: '' });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedImportMeals, setSelectedImportMeals] = useState<Set<string>>(new Set());
  const [mealsParent] = useAutoAnimate();
  const initializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get other plans for import (exclude current plan)
  const otherPlans = Object.values(data.mealPlans).filter(p => p.id !== planId);

  useEffect(() => {
    // Only initialize once per planId, not on every data change
    if (initializedRef.current) return;

    if (isNew) {
      const newPlan = createEmptyPlan('Neuer Plan');
      setEditingPlan(newPlan);
      initializedRef.current = true;
    } else if (data.mealPlans[planId]) {
      setEditingPlan(clonePlan(data.mealPlans[planId]));
      setExpandedMeals(new Set(data.mealPlans[planId].meals.map(m => m.id)));
      initializedRef.current = true;
    }
  }, [planId, isNew, data.mealPlans]);

  // Reset initialized flag when planId changes
  useEffect(() => {
    initializedRef.current = false;
  }, [planId]);

  // Auto-save with debounce
  useEffect(() => {
    if (!editingPlan || !initializedRef.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      if (isNew) {
        createPlan(editingPlan);
        router.replace(`/plans/${editingPlan.id}`);
      } else {
        updatePlan(editingPlan);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editingPlan, isNew, createPlan, updatePlan, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const activeItem = activeId && activeMealId && activeType === 'item' && editingPlan
    ? editingPlan.meals.find(m => m.id === activeMealId)?.items.find(i => i.id === activeId)
    : null;
  const activeMeal = activeId && activeType === 'meal' && editingPlan
    ? editingPlan.meals.find(m => m.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveMealId(active.data.current?.mealId as string);
    setActiveType(active.data.current?.type as 'item' | 'meal');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !editingPlan) {
      setActiveId(null);
      setActiveMealId(null);
      setActiveType(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'meal') {
      const oldIndex = editingPlan.meals.findIndex(m => m.id === active.id);
      const newIndex = editingPlan.meals.findIndex(m => m.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setEditingPlan({
          ...editingPlan,
          meals: arrayMove(editingPlan.meals, oldIndex, newIndex),
        });
        
      }
    } else if (activeData?.type === 'item' && overData?.type === 'item') {
      const sourceMealId = activeData.mealId as string;
      const targetMealId = overData.mealId as string;

      if (sourceMealId === targetMealId) {
        // Reorder within same meal
        const meal = editingPlan.meals.find(m => m.id === sourceMealId);
        if (meal) {
          const oldIndex = meal.items.findIndex(i => i.id === active.id);
          const newIndex = meal.items.findIndex(i => i.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            setEditingPlan({
              ...editingPlan,
              meals: editingPlan.meals.map(m =>
                m.id === sourceMealId
                  ? { ...m, items: arrayMove(m.items, oldIndex, newIndex) }
                  : m
              ),
            });
          }
        }
      } else {
        // Move to different meal
        moveItem(sourceMealId, targetMealId, active.id as string);
      }
    }

    setActiveId(null);
    setActiveMealId(null);
    setActiveType(null);
  };

  const handleBack = () => {
    router.push('/plans');
  };

  const handleExport = async (format: ExportFormat) => {
    if (!editingPlan) return;
    const text = exportPlan(editingPlan, format);
    await navigator.clipboard.writeText(text);
    setShowExportMenu(false);
  };

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

  const toggleImportMeal = (mealKey: string) => {
    setSelectedImportMeals(prev => {
      const next = new Set(prev);
      if (next.has(mealKey)) next.delete(mealKey);
      else next.add(mealKey);
      return next;
    });
  };

  const importSelectedMeals = () => {
    if (!editingPlan) return;
    const mealsToImport: Meal[] = [];

    for (const key of selectedImportMeals) {
      const [planId, mealId] = key.split('::');
      const plan = data.mealPlans[planId];
      const meal = plan?.meals.find(m => m.id === mealId);
      if (meal) {
        mealsToImport.push(cloneMeal(meal));
      }
    }

    if (mealsToImport.length > 0) {
      setEditingPlan({
        ...editingPlan,
        meals: [...editingPlan.meals, ...mealsToImport],
      });
      setExpandedMeals(prev => new Set([...prev, ...mealsToImport.map(m => m.id)]));
    }

    setSelectedImportMeals(new Set());
    setShowImportDialog(false);
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

  const moveItem = (fromMealId: string, toMealId: string, itemId: string) => {
    if (!editingPlan || fromMealId === toMealId) return;
    const fromMeal = editingPlan.meals.find(m => m.id === fromMealId);
    const itemToMove = fromMeal?.items.find(i => i.id === itemId);
    if (!itemToMove) return;

    setEditingPlan({
      ...editingPlan,
      meals: editingPlan.meals.map(m => {
        if (m.id === fromMealId) {
          return { ...m, items: m.items.filter(i => i.id !== itemId) };
        }
        if (m.id === toMealId) {
          return { ...m, items: [...m.items, itemToMove] };
        }
        return m;
      }),
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

  if (!editingPlan) {
    return (
      <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-3xl">
        <p className="text-zinc-500">Plan wird geladen...</p>
      </div>
    );
  }

  const planTotals = getPlanTotals(editingPlan);

  return (
    <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-zinc-500 text-sm">{isNew ? 'Neuer Plan' : 'Plan bearbeiten'}</p>
          <input
            type="text"
            value={editingPlan.name}
            onChange={(e) => updatePlanName(e.target.value)}
            className="text-xl font-semibold tracking-tight bg-transparent border-none outline-none w-full"
            placeholder="Plan Name"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button onClick={() => setShowExportMenu(!showExportMenu)} size="sm" variant="secondary">
              <Download size={16} />
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
                <button onClick={() => handleExport('text')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">Text</button>
                <button onClick={() => handleExport('table')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">Tabelle</button>
                <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700">JSON</button>
              </div>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded ${
            lastSyncError ? 'text-red-500' : isSyncing ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            {lastSyncError ? 'Fehler!' : isSyncing ? 'Speichert...' : 'Gespeichert'}
          </span>
        </div>
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={editingPlan.meals.map(m => m.id)} strategy={verticalListSortingStrategy}>
      <div ref={mealsParent} className="space-y-4">
        {editingPlan.meals.map((meal) => {
          const mealTotals = getMealTotals(meal);
          const isExpanded = expandedMeals.has(meal.id);

          return (
            <SortableMeal key={meal.id} id={meal.id}>
              {({ dragHandleProps }) => (
            <Card className="p-0 overflow-hidden">
              {/* Meal Header */}
              <div
                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer hover:bg-zinc-800/50"
                onClick={() => toggleMealExpanded(meal.id)}
              >
                {/* Drag Handle */}
                <button
                  ref={dragHandleProps.ref}
                  {...dragHandleProps.attributes}
                  {...dragHandleProps.listeners}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-none"
                  aria-label="Drag to reorder"
                >
                  <GripVertical size={16} />
                </button>
                <div className="text-zinc-400">
                  <MealIcon icon={meal.icon} />
                </div>
                <div className="flex-1 min-w-0">
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
                    setDeleteMealDialog({ open: true, mealId: meal.id, mealName: meal.name });
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
                  {/* Icon & Time Selection - stack on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border-b border-zinc-800/50">
                    <div className="flex gap-2">
                      {(['sunrise', 'sun', 'sunset', 'cookie'] as const).map((icon) => (
                        <button
                          key={icon}
                          onClick={() => updateMeal(meal.id, { icon })}
                          className={`p-2.5 sm:p-2 rounded ${
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
                      className="flex-1 bg-zinc-800 rounded px-3 py-2.5 sm:py-2 text-sm"
                    />
                  </div>

                  {/* Items List */}
                  <SortableContext items={meal.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="p-4 space-y-3">
                    {meal.items.map((item) => {
                      const itemTotals = getItemTotals(item);
                      const isItemExpanded = expandedItems.has(item.id);

                      return (
                        <SortableItem key={item.id} id={item.id} mealId={meal.id}>
                        <div
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
                                    : `${item.quantity}${item.unit === 'g' || item.unit === 'ml' ? `${item.unit} ` : '× '}${item.name}`
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
                              {(!item.alternatives || item.alternatives.length === 0) ? (
                                <>
                                  {/* Name - full width */}
                                  <Input
                                    label="Name"
                                    value={item.name}
                                    onChange={(v) => updateItem(meal.id, item.id, { name: v })}
                                    placeholder="z.B. Eier"
                                  />
                                  {/* Quantity & Unit */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      label="Menge"
                                      type="number"
                                      value={item.quantity.toString()}
                                      onChange={(v) => updateItem(meal.id, item.id, { quantity: parseFloat(v) || 0 })}
                                    />
                                    <div>
                                      <label className="block text-xs sm:text-sm text-zinc-400 mb-1.5">Einheit</label>
                                      <select
                                        value={item.unit}
                                        onChange={(e) => updateItem(meal.id, item.id, { unit: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
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
                                  <p className="text-xs text-zinc-500 font-medium mt-2">
                                    Nährwerte pro {item.unit === 'g' ? '100g' : item.unit === 'ml' ? '100ml' : 'Einheit'}:
                                  </p>
                                  {/* Macros - 2x2 on mobile */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                <div className="space-y-3">
                                  <Input
                                    label="Gruppenname"
                                    value={item.groupName || ''}
                                    onChange={(v) => updateItem(meal.id, item.id, { groupName: v })}
                                    placeholder="z.B. Beilage, Protein, Kohlenhydrate"
                                  />

                                  <div className="bg-zinc-900/50 rounded-lg p-3 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-zinc-500 font-medium shrink-0">Option 1</span>
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateItem(meal.id, item.id, { name: e.target.value })}
                                        className="flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none"
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
                                        <label className="block text-xs sm:text-sm text-zinc-400 mb-1.5">Einheit</label>
                                        <select
                                          value={item.unit}
                                          onChange={(e) => updateItem(meal.id, item.id, { unit: e.target.value })}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
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
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

                                  {item.alternatives.map((alt, index) => {
                                    const altTotals = getItemTotals(alt);
                                    return (
                                      <div key={alt.id} className="bg-zinc-900/50 rounded-lg p-3 space-y-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-zinc-500 font-medium shrink-0">Option {index + 2}</span>
                                          <input
                                            type="text"
                                            value={alt.name}
                                            onChange={(e) => updateAlternative(meal.id, item.id, alt.id, { name: e.target.value })}
                                            className="flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none"
                                            placeholder="Name"
                                          />
                                          <button
                                            onClick={() => deleteAlternative(meal.id, item.id, alt.id)}
                                            className="p-1.5 text-zinc-600 hover:text-red-500"
                                          >
                                            <X size={14} />
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
                                            <label className="block text-xs sm:text-sm text-zinc-400 mb-1.5">Einheit</label>
                                            <select
                                              value={alt.unit}
                                              onChange={(e) => updateAlternative(meal.id, item.id, alt.id, { unit: e.target.value })}
                                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
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
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        </SortableItem>
                      );
                    })}

                    <button
                      onClick={() => addItem(meal.id)}
                      className="w-full py-2 px-4 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Item hinzufügen
                    </button>
                  </div>
                  </SortableContext>
                </div>
              )}
            </Card>
              )}
            </SortableMeal>
          );
        })}

        <div className="flex gap-2">
          <button
            onClick={addMeal}
            className="flex-1 py-4 px-4 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Neue Mahlzeit
          </button>
          {otherPlans.length > 0 && (
            <button
              onClick={() => setShowImportDialog(true)}
              className="py-4 px-4 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-amber-500/50 hover:text-amber-500 text-sm flex items-center justify-center gap-2"
            >
              <Import size={16} /> Importieren
            </button>
          )}
        </div>
      </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="bg-zinc-800 rounded-lg p-3 shadow-xl border border-zinc-600 opacity-90">
            <span className="text-sm font-medium">
              {activeItem.alternatives?.length
                ? (activeItem.groupName || 'Optionen')
                : `${activeItem.quantity}${activeItem.unit === 'g' || activeItem.unit === 'ml' ? `${activeItem.unit} ` : '× '}${activeItem.name}`
              }
            </span>
          </div>
        ) : activeMeal ? (
          <Card className="p-4 shadow-xl border border-zinc-600 opacity-90">
            <div className="flex items-center gap-3">
              <MealIcon icon={activeMeal.icon} />
              <span className="font-medium">{activeMeal.name}</span>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold">Mahlzeiten importieren</h2>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setSelectedImportMeals(new Set());
                }}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {otherPlans.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Keine anderen Pläne vorhanden</p>
              ) : (
                otherPlans.map(plan => (
                  <div key={plan.id}>
                    <p className="text-sm text-zinc-400 mb-2">{plan.name}</p>
                    <div className="space-y-1">
                      {plan.meals.map(meal => {
                        const key = `${plan.id}::${meal.id}`;
                        const isSelected = selectedImportMeals.has(key);
                        const mealTotals = getMealTotals(meal);
                        return (
                          <button
                            key={meal.id}
                            onClick={() => toggleImportMeal(key)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-500/50'
                                : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                            }`}
                          >
                            <div className="text-zinc-400">
                              <MealIcon icon={meal.icon} size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{meal.name}</p>
                              <p className="text-xs text-zinc-500">
                                {mealTotals.calories} kcal · {mealTotals.protein}g P · {meal.items.length} Items
                              </p>
                            </div>
                            {isSelected && (
                              <Check size={18} className="text-amber-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedImportMeals.size > 0 && (
              <div className="p-4 border-t border-zinc-800">
                <Button onClick={importSelectedMeals} className="w-full">
                  {selectedImportMeals.size} Mahlzeit{selectedImportMeals.size > 1 ? 'en' : ''} importieren
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteMealDialog.open}
        onOpenChange={(open) => setDeleteMealDialog(prev => ({ ...prev, open }))}
        title="Mahlzeit löschen?"
        description={`"${deleteMealDialog.mealName}" wirklich löschen?`}
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        onConfirm={() => {
          if (deleteMealDialog.mealId) {
            deleteMeal(deleteMealDialog.mealId);
          }
        }}
        variant="danger"
      />
    </div>
  );
}
