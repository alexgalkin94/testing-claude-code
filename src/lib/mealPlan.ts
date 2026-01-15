// Meal Plan with per-unit values and quantity multipliers

export interface MealItem {
  id: string;
  name: string;
  // Per-unit values (e.g., per 1 egg, per 100g)
  caloriesPer: number;
  proteinPer: number;
  carbsPer: number;
  fatPer: number;
  // Quantity settings
  quantity: number; // Default quantity (e.g., 3 eggs)
  unit: string; // 'Stück', 'g', 'ml', 'Scheiben', etc.
  // Alternative items (e.g., 200g rice OR 400g potatoes)
  alternatives?: MealItem[];
  // Group name when item has alternatives (e.g., "Beilage" for Kartoffeln/Reis options)
  groupName?: string;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  icon: 'sunrise' | 'sun' | 'sunset' | 'cookie';
  items: MealItem[];
}

export interface MealPlan {
  id: string; // Unique ID (UUID)
  name: string; // Custom name like "Trainingstag", "Ruhetag"
  meals: Meal[];
}

// For backwards compatibility during migration
export interface DayPlan {
  id: 'A' | 'B';
  name: string;
  meals: Meal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

// Override for a specific item on a specific day
export interface ItemOverride {
  itemId: string;
  quantity?: number; // Overridden quantity for this day
  alternativeId?: string; // Selected alternative (if item has alternatives)
}

// Snapshot of a day's plan with potential overrides
export interface DaySnapshot {
  planId: string;
  planName: string;
  meals: Meal[]; // Full meal data at time of tracking
  overrides: ItemOverride[]; // Any quantity overrides for this day
}

// Get the effective item (considering selected alternative)
export function getEffectiveItem(item: MealItem, alternativeId?: string): MealItem {
  if (!alternativeId || !item.alternatives?.length) return item;
  const alt = item.alternatives.find(a => a.id === alternativeId);
  return alt || item;
}

// Helper to calculate item totals based on quantity
// For g/ml units: values are per 100g/100ml, so divide by 100
export function getItemTotals(item: MealItem, overrideQuantity?: number) {
  const qty = overrideQuantity ?? item.quantity;
  const divisor = (item.unit === 'g' || item.unit === 'ml') ? 100 : 1;
  return {
    calories: Math.round(item.caloriesPer * qty / divisor),
    protein: Math.round(item.proteinPer * qty / divisor * 10) / 10,
    carbs: Math.round(item.carbsPer * qty / divisor * 10) / 10,
    fat: Math.round(item.fatPer * qty / divisor * 10) / 10,
  };
}

// Helper to calculate meal totals
export function getMealTotals(meal: Meal, overrides: ItemOverride[] = []) {
  const result = meal.items.reduce((acc, item) => {
    const override = overrides.find(o => o.itemId === item.id);
    const effectiveItem = getEffectiveItem(item, override?.alternativeId);
    const totals = getItemTotals(effectiveItem, override?.quantity);
    return {
      calories: acc.calories + totals.calories,
      protein: acc.protein + totals.protein,
      carbs: acc.carbs + totals.carbs,
      fat: acc.fat + totals.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  return {
    calories: Math.round(result.calories),
    protein: Math.round(result.protein * 10) / 10,
    carbs: Math.round(result.carbs * 10) / 10,
    fat: Math.round(result.fat * 10) / 10,
  };
}

// Helper to calculate plan totals
export function getPlanTotals(plan: MealPlan, overrides: ItemOverride[] = []) {
  const result = plan.meals.reduce((acc, meal) => {
    const mealTotals = getMealTotals(meal, overrides);
    return {
      calories: acc.calories + mealTotals.calories,
      protein: acc.protein + mealTotals.protein,
      carbs: acc.carbs + mealTotals.carbs,
      fat: acc.fat + mealTotals.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  return {
    calories: Math.round(result.calories),
    protein: Math.round(result.protein * 10) / 10,
    carbs: Math.round(result.carbs * 10) / 10,
    fat: Math.round(result.fat * 10) / 10,
  };
}

// Default Plan A: Iglo & Potato Tag (~1718 kcal)
const PLAN_A_MEALS: Meal[] = [
  {
    id: 'breakfast-a',
    name: 'Frühstück',
    time: 'Pre-Workout',
    icon: 'sunrise',
    items: [
      {
        id: 'carbs-breakfast',
        name: 'Kohlenhydrate',
        caloriesPer: 96,
        proteinPer: 3,
        carbsPer: 18.3,
        fatPer: 0.7,
        quantity: 3,
        unit: 'Portion',
      },
      {
        id: 'eggs',
        name: 'Eier (L)',
        caloriesPer: 90,
        proteinPer: 7.7,
        carbsPer: 0.3,
        fatPer: 6.3,
        quantity: 3,
        unit: 'Stück',
      },
      {
        id: 'exquisa',
        name: 'Exquisa 0,2%',
        caloriesPer: 60,
        proteinPer: 10,
        carbsPer: 3,
        fatPer: 0,
        quantity: 30,
        unit: 'g',
      },
      {
        id: 'schinken',
        name: 'Hinterkochschinken',
        caloriesPer: 108,
        proteinPer: 20,
        carbsPer: 2,
        fatPer: 4,
        quantity: 50,
        unit: 'g',
      },
      {
        id: 'omega3',
        name: 'Omega-3 Algenöl',
        caloriesPer: 20,
        proteinPer: 0,
        carbsPer: 0,
        fatPer: 2,
        quantity: 1,
        unit: 'Portion',
      },
    ],
  },
  {
    id: 'lunch-a',
    name: 'Mittag',
    time: 'Post-Workout',
    icon: 'sun',
    items: [
      {
        id: 'iglo',
        name: 'Iglo Schlemmer-Filet',
        caloriesPer: 77,
        proteinPer: 11,
        carbsPer: 3.2,
        fatPer: 2.4,
        quantity: 380,
        unit: 'g',
      },
      {
        id: 'carbs-lunch',
        name: 'Beilage',
        caloriesPer: 70,
        proteinPer: 1.6,
        carbsPer: 15.6,
        fatPer: 0,
        quantity: 250,
        unit: 'g',
      },
    ],
  },
  {
    id: 'dinner-a',
    name: 'Abendessen',
    time: '~18:00',
    icon: 'sunset',
    items: [
      {
        id: 'protein-dinner',
        name: 'Protein',
        caloriesPer: 106,
        proteinPer: 23,
        carbsPer: 0,
        fatPer: 1,
        quantity: 200,
        unit: 'g',
      },
      {
        id: 'veggies-dinner',
        name: 'Frosta Gemüsepfanne',
        caloriesPer: 55,
        proteinPer: 1.7,
        carbsPer: 6.25,
        fatPer: 2.1,
        quantity: 480,
        unit: 'g',
      },
    ],
  },
  {
    id: 'snack-a',
    name: 'Snack',
    time: 'Abends',
    icon: 'cookie',
    items: [
      {
        id: 'protein-snack',
        name: 'Protein-Dessert',
        caloriesPer: 62,
        proteinPer: 11,
        carbsPer: 4,
        fatPer: 0,
        quantity: 200,
        unit: 'g',
      },
    ],
  },
];

export const DEFAULT_PLAN_A: MealPlan = {
  id: 'default-plan-a',
  name: 'Trainingstag',
  meals: PLAN_A_MEALS,
};

// Default Plan B: Variety & Rice (~1688 kcal)
const PLAN_B_MEALS: Meal[] = [
  {
    id: 'breakfast-b',
    name: 'Frühstück',
    time: 'Pre-Workout',
    icon: 'sunrise',
    items: [
      {
        id: 'carbs-breakfast-b',
        name: 'Kohlenhydrate',
        caloriesPer: 96,
        proteinPer: 3,
        carbsPer: 18.3,
        fatPer: 0.7,
        quantity: 3,
        unit: 'Portion',
      },
      {
        id: 'eggs-b',
        name: 'Eier (L)',
        caloriesPer: 90,
        proteinPer: 7.7,
        carbsPer: 0.3,
        fatPer: 6.3,
        quantity: 3,
        unit: 'Stück',
      },
      {
        id: 'exquisa-b',
        name: 'Exquisa 0,2%',
        caloriesPer: 60,
        proteinPer: 10,
        carbsPer: 3,
        fatPer: 0,
        quantity: 30,
        unit: 'g',
      },
      {
        id: 'schinken-b',
        name: 'Hinterkochschinken',
        caloriesPer: 108,
        proteinPer: 20,
        carbsPer: 2,
        fatPer: 4,
        quantity: 50,
        unit: 'g',
      },
      {
        id: 'omega3-b',
        name: 'Omega-3 Algenöl',
        caloriesPer: 20,
        proteinPer: 0,
        carbsPer: 0,
        fatPer: 2,
        quantity: 1,
        unit: 'Portion',
      },
    ],
  },
  {
    id: 'lunch-b',
    name: 'Mittag',
    time: 'Post-Workout',
    icon: 'sun',
    items: [
      {
        id: 'protein-lunch-b',
        name: 'Protein',
        caloriesPer: 106,
        proteinPer: 23,
        carbsPer: 0,
        fatPer: 1,
        quantity: 200,
        unit: 'g',
      },
      {
        id: 'carbs-lunch-b',
        name: 'Beilage',
        caloriesPer: 349,
        proteinPer: 7.1,
        carbsPer: 77,
        fatPer: 1.4,
        quantity: 70,
        unit: 'g',
      },
      {
        id: 'veggies-lunch-b',
        name: 'Frosta Gemüsepfanne',
        caloriesPer: 55,
        proteinPer: 1.7,
        carbsPer: 6.25,
        fatPer: 2.1,
        quantity: 240,
        unit: 'g',
      },
    ],
  },
  {
    id: 'dinner-b',
    name: 'Abendessen',
    time: '~18:00',
    icon: 'sunset',
    items: [
      {
        id: 'protein-dinner-b',
        name: 'Protein',
        caloriesPer: 129,
        proteinPer: 21.1,
        carbsPer: 0,
        fatPer: 5.1,
        quantity: 175,
        unit: 'g',
      },
      {
        id: 'veggies-dinner-b',
        name: 'Frosta Gemüsepfanne',
        caloriesPer: 55,
        proteinPer: 1.7,
        carbsPer: 6.25,
        fatPer: 2.1,
        quantity: 240,
        unit: 'g',
      },
    ],
  },
  {
    id: 'snack-b',
    name: 'Snack',
    time: 'Abends',
    icon: 'cookie',
    items: [
      {
        id: 'protein-snack-b',
        name: 'Protein-Dessert',
        caloriesPer: 62,
        proteinPer: 11,
        carbsPer: 4,
        fatPer: 0,
        quantity: 150,
        unit: 'g',
      },
    ],
  },
];

export const DEFAULT_PLAN_B: MealPlan = {
  id: 'default-plan-b',
  name: 'Ruhetag',
  meals: PLAN_B_MEALS,
};

// All default plans for initialization
export const DEFAULT_MEAL_PLANS: { [id: string]: MealPlan } = {
  'default-plan-a': DEFAULT_PLAN_A,
  'default-plan-b': DEFAULT_PLAN_B,
};

// Legacy compatibility - calculate totals for old DayPlan format
function calculateTotals(meals: Meal[]): { calories: number; protein: number; carbs: number; fat: number } {
  return meals.reduce((acc, meal) => {
    const mealTotals = getMealTotals(meal, []);
    return {
      calories: acc.calories + mealTotals.calories,
      protein: acc.protein + mealTotals.protein,
      carbs: acc.carbs + mealTotals.carbs,
      fat: acc.fat + mealTotals.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// Legacy exports for backwards compatibility during migration
export const DAY_A: DayPlan = {
  id: 'A',
  name: 'Trainingstag',
  meals: PLAN_A_MEALS,
  totals: calculateTotals(PLAN_A_MEALS),
};

export const DAY_B: DayPlan = {
  id: 'B',
  name: 'Ruhetag',
  meals: PLAN_B_MEALS,
  totals: calculateTotals(PLAN_B_MEALS),
};

// Generate unique ID for new plans
export function generatePlanId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique ID for new items
export function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique ID for new meals
export function generateMealId(): string {
  return `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty meal plan template
export function createEmptyPlan(name: string = 'Neuer Plan'): MealPlan {
  return {
    id: generatePlanId(),
    name,
    meals: [],
  };
}

// Create empty meal template
export function createEmptyMeal(name: string = 'Neue Mahlzeit'): Meal {
  return {
    id: generateMealId(),
    name,
    time: '',
    icon: 'sun',
    items: [],
  };
}

// Create empty item template
export function createEmptyItem(name: string = 'Neues Item'): MealItem {
  return {
    id: generateItemId(),
    name,
    caloriesPer: 0,
    proteinPer: 0,
    carbsPer: 0,
    fatPer: 0,
    quantity: 1,
    unit: 'Portion',
  };
}

// Deep clone a meal plan (for editing)
export function clonePlan(plan: MealPlan): MealPlan {
  return JSON.parse(JSON.stringify(plan));
}

// Legacy helper for backwards compatibility
export function getPlan(type: 'A' | 'B'): DayPlan {
  return type === 'A' ? DAY_A : DAY_B;
}
