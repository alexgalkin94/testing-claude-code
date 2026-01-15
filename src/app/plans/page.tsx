'use client';

import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useData } from '@/lib/data-store';
import { getPlanTotals } from '@/lib/mealPlan';

export default function PlansPage() {
  const router = useRouter();
  const { data, deletePlan } = useData();
  const [plansParent] = useAutoAnimate();

  const plans = Object.values(data.mealPlans);

  const handleEditPlan = (planId: string) => {
    router.push(`/plans/${planId}`);
  };

  const handleCreatePlan = () => {
    router.push('/plans/new');
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

      <div ref={plansParent} className="space-y-3">
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
                    onClick={() => handleEditPlan(plan.id)}
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
