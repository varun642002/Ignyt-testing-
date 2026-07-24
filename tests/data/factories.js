export const createProfile = (overrides = {}) => ({ name: 'Playwright Athlete', height: 178, weight: 75, unit: 'metric', ...overrides });
export const createBodyEntry = (overrides = {}) => ({ id: `body-${Date.now()}`, date: '2026-07-24', weight: 75, ...overrides });
export const createRoutine = (overrides = {}) => ({ id: `routine-${Date.now()}`, name: 'QA Full Body', exercises: [], ...overrides });
export const createFoodEntry = (overrides = {}) => ({ id: `food-${Date.now()}`, name: 'QA Oats', calories: 150, protein: 5, carbs: 27, fat: 3, ...overrides });
