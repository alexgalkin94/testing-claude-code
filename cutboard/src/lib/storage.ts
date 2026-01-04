// LocalStorage wrapper with type safety

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface CalorieEntry {
  date: string;
  calories: number;
  protein: number;
  meals: { name: string; calories: number; protein: number; time: string }[];
}

export interface Measurement {
  date: string;
  waist?: number;
  chest?: number;
  arms?: number;
  thighs?: number;
  hips?: number;
}

export interface UserSettings {
  name: string;
  startWeight: number;
  goalWeight: number;
  calorieTarget: number;
  proteinTarget: number;
  tdee: number;
  startDate: string;
}

export interface FastingSession {
  startTime: string;
  endTime: string | null;
  targetHours: number;
}

const KEYS = {
  weights: 'cutboard_weights',
  calories: 'cutboard_calories',
  measurements: 'cutboard_measurements',
  settings: 'cutboard_settings',
  fasting: 'cutboard_fasting',
  fastingHistory: 'cutboard_fasting_history',
};

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Weight
export function getWeights(): WeightEntry[] {
  return getItem(KEYS.weights, []);
}

export function addWeight(entry: WeightEntry): void {
  const weights = getWeights();
  const existingIndex = weights.findIndex(w => w.date === entry.date);
  if (existingIndex >= 0) {
    weights[existingIndex] = entry;
  } else {
    weights.push(entry);
  }
  weights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  setItem(KEYS.weights, weights);
}

// Calories
export function getCalories(): CalorieEntry[] {
  return getItem(KEYS.calories, []);
}

export function getCaloriesForDate(date: string): CalorieEntry | null {
  const calories = getCalories();
  return calories.find(c => c.date === date) || null;
}

export function addMeal(date: string, meal: { name: string; calories: number; protein: number; time: string }): void {
  const calories = getCalories();
  const existingIndex = calories.findIndex(c => c.date === date);

  if (existingIndex >= 0) {
    calories[existingIndex].meals.push(meal);
    calories[existingIndex].calories += meal.calories;
    calories[existingIndex].protein += meal.protein;
  } else {
    calories.push({
      date,
      calories: meal.calories,
      protein: meal.protein,
      meals: [meal],
    });
  }
  setItem(KEYS.calories, calories);
}

export function removeMeal(date: string, mealIndex: number): void {
  const calories = getCalories();
  const existingIndex = calories.findIndex(c => c.date === date);

  if (existingIndex >= 0) {
    const meal = calories[existingIndex].meals[mealIndex];
    if (meal) {
      calories[existingIndex].calories -= meal.calories;
      calories[existingIndex].protein -= meal.protein;
      calories[existingIndex].meals.splice(mealIndex, 1);
      setItem(KEYS.calories, calories);
    }
  }
}

// Measurements
export function getMeasurements(): Measurement[] {
  return getItem(KEYS.measurements, []);
}

export function addMeasurement(entry: Measurement): void {
  const measurements = getMeasurements();
  const existingIndex = measurements.findIndex(m => m.date === entry.date);
  if (existingIndex >= 0) {
    measurements[existingIndex] = { ...measurements[existingIndex], ...entry };
  } else {
    measurements.push(entry);
  }
  measurements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  setItem(KEYS.measurements, measurements);
}

// Settings
export function getSettings(): UserSettings | null {
  return getItem(KEYS.settings, null);
}

export function saveSettings(settings: UserSettings): void {
  setItem(KEYS.settings, settings);
}

// Fasting
export function getCurrentFast(): FastingSession | null {
  return getItem(KEYS.fasting, null);
}

export function startFast(targetHours: number): FastingSession {
  const session: FastingSession = {
    startTime: new Date().toISOString(),
    endTime: null,
    targetHours,
  };
  setItem(KEYS.fasting, session);
  return session;
}

export function endFast(): FastingSession | null {
  const current = getCurrentFast();
  if (current) {
    current.endTime = new Date().toISOString();
    // Add to history
    const history = getFastingHistory();
    history.push(current);
    setItem(KEYS.fastingHistory, history);
    // Clear current
    localStorage.removeItem(KEYS.fasting);
    return current;
  }
  return null;
}

export function getFastingHistory(): FastingSession[] {
  return getItem(KEYS.fastingHistory, []);
}

// Calculate 7-day moving average for weights
export function getMovingAverage(weights: WeightEntry[], days: number = 7): { date: string; avg: number }[] {
  if (weights.length === 0) return [];

  return weights.map((entry, index) => {
    const start = Math.max(0, index - days + 1);
    const slice = weights.slice(start, index + 1);
    const avg = slice.reduce((sum, w) => sum + w.weight, 0) / slice.length;
    return { date: entry.date, avg: Math.round(avg * 10) / 10 };
  });
}
