// Simplified Meal Plan with grouped interchangeable items

export interface MealItem {
  id: string;
  name: string;
  options?: string[]; // Alternative choices
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  icon: 'sunrise' | 'sun' | 'sunset' | 'cookie';
  items: MealItem[];
}

export interface DayPlan {
  id: 'A' | 'B';
  name: string;
  meals: Meal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

// Helper to calculate totals from meals
function calculateTotals(meals: Meal[]): { calories: number; protein: number; carbs: number; fat: number } {
  return meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// Tag A: Iglo & Potato Tag (~1718 kcal)
const DAY_A_MEALS: Meal[] = [
  {
    id: 'breakfast-a',
    name: 'Frühstück',
    time: 'Pre-Workout',
    icon: 'sunrise',
    items: [
      {
        id: 'carbs-breakfast',
        name: 'Kohlenhydrate',
        options: ['3x Sammy\'s Sandwich (112g)', '2x Toastbrötchen', '80g Haferflocken'],
        calories: 288,
        protein: 9,
        carbs: 55,
        fat: 2,
      },
      {
        id: 'eggs',
        name: '3 Eier (L)',
        calories: 270,
        protein: 23,
        carbs: 1,
        fat: 19,
      },
      {
        id: 'exquisa',
        name: '30g Exquisa 0,2%',
        calories: 18,
        protein: 3,
        carbs: 1,
        fat: 0,
      },
      {
        id: 'schinken',
        name: '50g Hinterkochschinken',
        options: ['Hinterkochschinken', 'Backschinken'],
        calories: 54,
        protein: 10,
        carbs: 1,
        fat: 2,
      },
      {
        id: 'omega3',
        name: 'Omega-3 Algenöl',
        calories: 20,
        protein: 0,
        carbs: 0,
        fat: 2,
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
        name: 'Iglo Schlemmer-Filet (380g)',
        options: ['Italiano', 'Broccoli', 'Champignon'],
        calories: 293,
        protein: 42,
        carbs: 12,
        fat: 9,
      },
      {
        id: 'carbs-lunch',
        name: 'Beilage',
        options: ['250g Kartoffeln', '250g Süßkartoffel', '50g Reis'],
        calories: 175,
        protein: 4,
        carbs: 39,
        fat: 0,
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
        name: 'Protein (200g roh)',
        options: ['Hähnchenbrustfilet', 'Pute', 'Weißfisch', 'Garnelen'],
        calories: 212,
        protein: 46,
        carbs: 0,
        fat: 2,
      },
      {
        id: 'veggies-dinner',
        name: 'Frosta Gemüsepfanne (480g)',
        calories: 264,
        protein: 8,
        carbs: 30,
        fat: 10,
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
        name: 'Protein-Dessert (200g)',
        options: ['Skyr Natur', 'Magerquark'],
        calories: 124,
        protein: 22,
        carbs: 8,
        fat: 0,
      },
    ],
  },
];

export const DAY_A: DayPlan = {
  id: 'A',
  name: 'Iglo & Potato',
  meals: DAY_A_MEALS,
  totals: calculateTotals(DAY_A_MEALS),
};

// Tag B: Variety & Rice (~1688 kcal)
const DAY_B_MEALS: Meal[] = [
  {
    id: 'breakfast-b',
    name: 'Frühstück',
    time: 'Pre-Workout',
    icon: 'sunrise',
    items: [
      {
        id: 'carbs-breakfast-b',
        name: 'Kohlenhydrate',
        options: ['3x Sammy\'s Sandwich (112g)', '2x Toastbrötchen', '80g Haferflocken'],
        calories: 288,
        protein: 9,
        carbs: 55,
        fat: 2,
      },
      {
        id: 'eggs-b',
        name: '3 Eier (L)',
        calories: 270,
        protein: 23,
        carbs: 1,
        fat: 19,
      },
      {
        id: 'exquisa-b',
        name: '30g Exquisa 0,2%',
        calories: 18,
        protein: 3,
        carbs: 1,
        fat: 0,
      },
      {
        id: 'schinken-b',
        name: '50g Hinterkochschinken',
        options: ['Hinterkochschinken', 'Backschinken'],
        calories: 54,
        protein: 10,
        carbs: 1,
        fat: 2,
      },
      {
        id: 'omega3-b',
        name: 'Omega-3 Algenöl',
        calories: 20,
        protein: 0,
        carbs: 0,
        fat: 2,
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
        name: 'Protein (200g roh)',
        options: ['Hähnchenbrustfilet', 'Pute', 'Weißfisch'],
        calories: 212,
        protein: 46,
        carbs: 0,
        fat: 2,
      },
      {
        id: 'carbs-lunch-b',
        name: 'Beilage',
        options: ['70g Reis (trocken)', '70g Nudeln', '350g Kartoffeln'],
        calories: 244,
        protein: 5,
        carbs: 54,
        fat: 1,
      },
      {
        id: 'veggies-lunch-b',
        name: 'Frosta Gemüsepfanne (240g)',
        calories: 132,
        protein: 4,
        carbs: 15,
        fat: 5,
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
        name: 'Protein (175g roh)',
        options: ['Rinderhack 5%', 'Rindertartar', 'Schweinefilet'],
        calories: 225,
        protein: 37,
        carbs: 0,
        fat: 9,
      },
      {
        id: 'veggies-dinner-b',
        name: 'Frosta Gemüsepfanne (240g)',
        calories: 132,
        protein: 4,
        carbs: 15,
        fat: 5,
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
        name: 'Protein-Dessert (150g)',
        options: ['Skyr Natur', 'Magerquark'],
        calories: 93,
        protein: 17,
        carbs: 6,
        fat: 0,
      },
    ],
  },
];

export const DAY_B: DayPlan = {
  id: 'B',
  name: 'Variety & Rice',
  meals: DAY_B_MEALS,
  totals: calculateTotals(DAY_B_MEALS),
};

// Storage functions
const STORAGE_KEY = 'cutboard_checklist';
const DAY_TYPE_KEY = 'cutboard_day_type';

export interface CheckedItems {
  [date: string]: string[]; // Array of checked item IDs
}

export function getCheckedItems(): CheckedItems {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

export function toggleItem(date: string, itemId: string): void {
  const checked = getCheckedItems();
  if (!checked[date]) checked[date] = [];

  const index = checked[date].indexOf(itemId);
  if (index >= 0) {
    checked[date].splice(index, 1);
  } else {
    checked[date].push(itemId);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
}

export function isItemChecked(date: string, itemId: string): boolean {
  const checked = getCheckedItems();
  return checked[date]?.includes(itemId) || false;
}

export function getDayType(): 'A' | 'B' {
  if (typeof window === 'undefined') return 'A';
  return (localStorage.getItem(DAY_TYPE_KEY) as 'A' | 'B') || 'A';
}

export function setDayType(type: 'A' | 'B'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAY_TYPE_KEY, type);
}

export function getPlan(type: 'A' | 'B'): DayPlan {
  return type === 'A' ? DAY_A : DAY_B;
}
