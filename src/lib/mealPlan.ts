// Day A & Day B Meal Plans

export type MealOption = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealSlot = {
  name: string;
  time: string;
  options: MealOption[];
  totalCalories: number;
  totalProtein: number;
};

export type DayPlan = {
  name: string;
  description: string;
  meals: MealSlot[];
  totalCalories: number;
  totalProtein: number;
};

// Day A: "Iglo & Potato" Tag
export const DAY_A: DayPlan = {
  name: 'Tag A',
  description: 'Iglo & Potato Tag',
  totalCalories: 1700,
  totalProtein: 157,
  meals: [
    {
      name: 'Frühstück (Pre-Workout)',
      time: '08:00',
      totalCalories: 630,
      totalProtein: 40,
      options: [
        { name: '3x Sammy\'s Super Sandwich', calories: 210, protein: 8, carbs: 36, fat: 3 },
        { name: '2x Toastbrötchen (Weizen)', calories: 220, protein: 7, carbs: 40, fat: 2 },
        { name: '80g Haferflocken', calories: 300, protein: 11, carbs: 52, fat: 6 },
        { name: '3 Eier (L)', calories: 230, protein: 20, carbs: 1, fat: 16 },
        { name: '30g Exquisa 0,2%', calories: 15, protein: 3, carbs: 1, fat: 0 },
        { name: '2 Scheiben Backschinken (50g)', calories: 55, protein: 9, carbs: 1, fat: 2 },
      ],
    },
    {
      name: 'Mittag (Post-Workout)',
      time: '13:00',
      totalCalories: 470,
      totalProtein: 45,
      options: [
        { name: 'Iglo Schlemmer-Filet Italiano', calories: 320, protein: 35, carbs: 15, fat: 8 },
        { name: 'Iglo Schlemmer-Filet Broccoli', calories: 310, protein: 33, carbs: 14, fat: 7 },
        { name: 'Iglo Schlemmer-Filet Champignon', calories: 305, protein: 32, carbs: 13, fat: 8 },
        { name: '250g Kartoffeln', calories: 150, protein: 4, carbs: 30, fat: 0 },
        { name: '200g Süßkartoffel', calories: 170, protein: 3, carbs: 38, fat: 0 },
        { name: '50g Reis (trocken)', calories: 175, protein: 4, carbs: 38, fat: 1 },
        { name: '50g Nudeln (trocken)', calories: 175, protein: 6, carbs: 35, fat: 1 },
      ],
    },
    {
      name: 'Abendessen',
      time: '18:00',
      totalCalories: 475,
      totalProtein: 50,
      options: [
        { name: '200g Hähnchenbrust', calories: 220, protein: 46, carbs: 0, fat: 3 },
        { name: '200g Putenbrust', calories: 210, protein: 44, carbs: 0, fat: 2 },
        { name: '175g Rinderhack Light (5%)', calories: 210, protein: 38, carbs: 0, fat: 6 },
        { name: '275g Weißfisch (Kabeljau)', calories: 220, protein: 50, carbs: 0, fat: 2 },
        { name: '225g Garnelen', calories: 200, protein: 45, carbs: 1, fat: 2 },
        { name: '1 Dose Thunfisch (im Saft)', calories: 190, protein: 42, carbs: 0, fat: 2 },
        { name: 'Frosta Gemüsepfanne (480g)', calories: 260, protein: 8, carbs: 35, fat: 8 },
      ],
    },
    {
      name: 'Snack',
      time: '20:00',
      totalCalories: 125,
      totalProtein: 22,
      options: [
        { name: '200g Skyr Natur', calories: 130, protein: 22, carbs: 8, fat: 0 },
        { name: '200g Magerquark', calories: 135, protein: 24, carbs: 8, fat: 0 },
        { name: '150g Körniger Frischkäse Light', calories: 110, protein: 18, carbs: 6, fat: 2 },
        { name: '30g Whey (in Wasser)', calories: 120, protein: 24, carbs: 2, fat: 1 },
      ],
    },
  ],
};

// Day B: "Variety" Tag
export const DAY_B: DayPlan = {
  name: 'Tag B',
  description: 'Variety Tag',
  totalCalories: 1705,
  totalProtein: 156,
  meals: [
    {
      name: 'Frühstück (Pre-Workout)',
      time: '08:00',
      totalCalories: 630,
      totalProtein: 40,
      options: [
        { name: '3x Sammy\'s Super Sandwich', calories: 210, protein: 8, carbs: 36, fat: 3 },
        { name: '2x Toastbrötchen (Weizen)', calories: 220, protein: 7, carbs: 40, fat: 2 },
        { name: '80g Haferflocken', calories: 300, protein: 11, carbs: 52, fat: 6 },
        { name: '3 Eier (L)', calories: 230, protein: 20, carbs: 1, fat: 16 },
        { name: '30g Exquisa 0,2%', calories: 15, protein: 3, carbs: 1, fat: 0 },
        { name: '2 Scheiben Backschinken (50g)', calories: 55, protein: 9, carbs: 1, fat: 2 },
      ],
    },
    {
      name: 'Mittag (Post-Workout)',
      time: '13:00',
      totalCalories: 590,
      totalProtein: 55,
      options: [
        { name: '200g Hähnchenbrust', calories: 220, protein: 46, carbs: 0, fat: 3 },
        { name: '200g Pute', calories: 210, protein: 44, carbs: 0, fat: 2 },
        { name: '275g Weißfisch', calories: 220, protein: 50, carbs: 0, fat: 2 },
        { name: '225g Garnelen', calories: 200, protein: 45, carbs: 1, fat: 2 },
        { name: '70g Reis (trocken)', calories: 245, protein: 5, carbs: 54, fat: 1 },
        { name: '70g Nudeln (trocken)', calories: 245, protein: 9, carbs: 49, fat: 2 },
        { name: '350g Kartoffeln', calories: 210, protein: 6, carbs: 42, fat: 0 },
        { name: '1/2 Frosta Gemüsepfanne (240g)', calories: 130, protein: 4, carbs: 18, fat: 4 },
      ],
    },
    {
      name: 'Abendessen',
      time: '18:00',
      totalCalories: 390,
      totalProtein: 45,
      options: [
        { name: '175g Rinderhack Light (5%)', calories: 210, protein: 38, carbs: 0, fat: 6 },
        { name: '175g Rindertartar', calories: 200, protein: 36, carbs: 0, fat: 6 },
        { name: '200g Hähnchenbrust', calories: 220, protein: 46, carbs: 0, fat: 3 },
        { name: '200g Schweinefilet', calories: 230, protein: 42, carbs: 0, fat: 6 },
        { name: '275g Weißfisch', calories: 220, protein: 50, carbs: 0, fat: 2 },
        { name: '1/2 Frosta Gemüsepfanne (240g)', calories: 130, protein: 4, carbs: 18, fat: 4 },
      ],
    },
    {
      name: 'Snack',
      time: '20:00',
      totalCalories: 95,
      totalProtein: 16,
      options: [
        { name: '150g Skyr Natur', calories: 98, protein: 17, carbs: 6, fat: 0 },
        { name: '150g Magerquark', calories: 100, protein: 18, carbs: 6, fat: 0 },
        { name: '25g Whey (in Wasser)', calories: 100, protein: 20, carbs: 2, fat: 1 },
      ],
    },
  ],
};

// Speichern welcher Tag heute gewählt ist
export function getDayType(): 'A' | 'B' {
  if (typeof window === 'undefined') return 'A';
  return (localStorage.getItem('cutboard_day_type') as 'A' | 'B') || 'A';
}

export function setDayType(type: 'A' | 'B'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cutboard_day_type', type);
}
