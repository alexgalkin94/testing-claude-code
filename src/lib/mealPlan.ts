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
  items: MealItem[];
}

export interface DayPlan {
  id: 'A' | 'B';
  name: string;
  meals: Meal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

// Tag A: Iglo & Potato Tag
export const DAY_A: DayPlan = {
  id: 'A',
  name: 'Iglo & Potato',
  totals: { calories: 1700, protein: 157, carbs: 148, fat: 43 },
  meals: [
    {
      id: 'breakfast-a',
      name: 'Frühstück',
      time: 'Pre-Workout',
      items: [
        {
          id: 'carbs-breakfast',
          name: 'Kohlenhydrate',
          options: ['3x Sammy\'s Sandwich', '2x Toastbrötchen', '80g Haferflocken'],
          calories: 220,
          protein: 8,
          carbs: 38,
          fat: 3,
        },
        {
          id: 'eggs',
          name: '3 Eier (L)',
          calories: 230,
          protein: 20,
          carbs: 1,
          fat: 16,
        },
        {
          id: 'exquisa',
          name: '30g Exquisa 0,2%',
          calories: 15,
          protein: 3,
          carbs: 1,
          fat: 0,
        },
        {
          id: 'schinken',
          name: '2 Scheiben Backschinken',
          calories: 55,
          protein: 9,
          carbs: 1,
          fat: 2,
        },
      ],
    },
    {
      id: 'lunch-a',
      name: 'Mittag',
      time: 'Post-Workout',
      items: [
        {
          id: 'iglo',
          name: 'Iglo Schlemmer-Filet',
          options: ['Italiano', 'Broccoli', 'Champignon'],
          calories: 310,
          protein: 33,
          carbs: 14,
          fat: 8,
        },
        {
          id: 'carbs-lunch',
          name: 'Beilage',
          options: ['250g Kartoffeln', '200g Süßkartoffel', '50g Reis', '50g Nudeln'],
          calories: 160,
          protein: 4,
          carbs: 32,
          fat: 0,
        },
      ],
    },
    {
      id: 'dinner-a',
      name: 'Abendessen',
      time: '~18:00',
      items: [
        {
          id: 'protein-dinner',
          name: 'Protein',
          options: ['200g Hähnchen', '200g Pute', '175g Rinderhack 5%', '275g Weißfisch', '225g Garnelen', 'Dose Thunfisch'],
          calories: 210,
          protein: 44,
          carbs: 0,
          fat: 3,
        },
        {
          id: 'veggies-dinner',
          name: 'Frosta Gemüsepfanne 480g',
          calories: 260,
          protein: 8,
          carbs: 35,
          fat: 8,
        },
      ],
    },
    {
      id: 'snack-a',
      name: 'Snack',
      time: 'Abends',
      items: [
        {
          id: 'protein-snack',
          name: 'Protein-Dessert',
          options: ['200g Skyr', '200g Magerquark', '150g Körniger Frischkäse', '30g Whey'],
          calories: 125,
          protein: 22,
          carbs: 8,
          fat: 0,
        },
      ],
    },
  ],
};

// Tag B: Variety Tag
export const DAY_B: DayPlan = {
  id: 'B',
  name: 'Variety',
  totals: { calories: 1705, protein: 156, carbs: 135, fat: 43 },
  meals: [
    {
      id: 'breakfast-b',
      name: 'Frühstück',
      time: 'Pre-Workout',
      items: [
        {
          id: 'carbs-breakfast-b',
          name: 'Kohlenhydrate',
          options: ['3x Sammy\'s Sandwich', '2x Toastbrötchen', '80g Haferflocken'],
          calories: 220,
          protein: 8,
          carbs: 38,
          fat: 3,
        },
        {
          id: 'eggs-b',
          name: '3 Eier (L)',
          calories: 230,
          protein: 20,
          carbs: 1,
          fat: 16,
        },
        {
          id: 'exquisa-b',
          name: '30g Exquisa 0,2%',
          calories: 15,
          protein: 3,
          carbs: 1,
          fat: 0,
        },
        {
          id: 'schinken-b',
          name: '2 Scheiben Backschinken',
          calories: 55,
          protein: 9,
          carbs: 1,
          fat: 2,
        },
      ],
    },
    {
      id: 'lunch-b',
      name: 'Mittag',
      time: 'Post-Workout',
      items: [
        {
          id: 'protein-lunch-b',
          name: 'Protein',
          options: ['200g Hähnchen', '200g Pute', '275g Weißfisch', '225g Garnelen'],
          calories: 215,
          protein: 45,
          carbs: 0,
          fat: 3,
        },
        {
          id: 'carbs-lunch-b',
          name: 'Beilage (mehr Carbs)',
          options: ['70g Reis', '70g Nudeln', '350g Kartoffeln'],
          calories: 245,
          protein: 6,
          carbs: 50,
          fat: 1,
        },
        {
          id: 'veggies-lunch-b',
          name: '½ Frosta Gemüsepfanne',
          calories: 130,
          protein: 4,
          carbs: 18,
          fat: 4,
        },
      ],
    },
    {
      id: 'dinner-b',
      name: 'Abendessen',
      time: '~18:00',
      items: [
        {
          id: 'protein-dinner-b',
          name: 'Protein (herzhaft)',
          options: ['175g Rinderhack 5%', '175g Rindertartar', '200g Hähnchen', '200g Schweinefilet', '275g Weißfisch'],
          calories: 215,
          protein: 40,
          carbs: 0,
          fat: 5,
        },
        {
          id: 'veggies-dinner-b',
          name: '½ Frosta Gemüsepfanne',
          calories: 130,
          protein: 4,
          carbs: 18,
          fat: 4,
        },
      ],
    },
    {
      id: 'snack-b',
      name: 'Snack',
      time: 'Abends',
      items: [
        {
          id: 'protein-snack-b',
          name: 'Protein-Dessert',
          options: ['150g Skyr', '150g Magerquark', '25g Whey'],
          calories: 95,
          protein: 17,
          carbs: 6,
          fat: 0,
        },
      ],
    },
  ],
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
