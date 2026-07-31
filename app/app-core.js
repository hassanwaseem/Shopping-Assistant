'use strict';

const engine = window.MealPlannerEngine;
const STORAGE_KEY = 'mealPlannerSpecV3';
const LEGACY_STORAGE_KEY = 'pamplonaPantryV2';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['breakfast', 'lunch', 'dinner'];
const NAV_ITEMS = [
  { id: 'today', label: 'Today', icon: '◉' },
  { id: 'plan', label: 'Plan', icon: '▦' },
  { id: 'recipes', label: 'Recipes', icon: '▤' },
  { id: 'nutrition', label: 'Nutrition', icon: '◌' },
  { id: 'pantry', label: 'Pantry', icon: '□' },
  { id: 'shop', label: 'Shop', icon: '✓' },
  { id: 'more', label: 'More', icon: '•••', desktopOnly: true },
];

const NUTRIENT_META = {
  kcal: { label: 'Energy', unit: 'kcal', decimals: 0 },
  protein: { label: 'Protein', unit: 'g', decimals: 1 },
  carbs: { label: 'Carbohydrate', unit: 'g', decimals: 1 },
  fat: { label: 'Fat', unit: 'g', decimals: 1 },
  fibre: { label: 'Fibre', unit: 'g', decimals: 1 },
  iron: { label: 'Iron', unit: 'mg', decimals: 1 },
  calcium: { label: 'Calcium', unit: 'mg', decimals: 0 },
  vitaminC: { label: 'Vitamin C', unit: 'mg', decimals: 0 },
};

let RECIPES = [];
let RECIPE_MAP = {};
let CUISINES = [];
let REGIONS = [];
let DISH_TYPES = [];
let MAIN_INGREDIENTS = [];

let state = loadState();
let activeView = 'today';
let activeNutritionPerson = state.people[0]?.id || 'p1';
let toastTimer;
let pendingConfirmResolve = null;
const recipeBrowser = {
  search: '',
  region: 'all',
  dishType: 'all',
  mainIngredient: 'all',
  diet: 'all',
  maxTime: 'all',
  page: 0,
  pageSize: 24,
};

function installRecipes(recipes) {
  RECIPES = Array.isArray(recipes) ? recipes : [];
  RECIPE_MAP = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));
  CUISINES = [...new Set(RECIPES.map((recipe) => recipe.cuisine))].sort((a, b) => a.localeCompare(b));
  REGIONS = [...new Set(RECIPES.map((recipe) => recipe.region))].sort((a, b) => {
    if (a === 'Pakistan-wide') return -1;
    if (b === 'Pakistan-wide') return 1;
    if (a === 'Afghanistan') return 1;
    if (b === 'Afghanistan') return -1;
    return a.localeCompare(b);
  });
  DISH_TYPES = (window.PakistaniRecipeAdapter?.DISH_TYPES || [])
    .filter((type) => RECIPES.some((recipe) => recipe.dishType === type));
  MAIN_INGREDIENTS = (window.PakistaniRecipeAdapter?.MAIN_INGREDIENTS || [])
    .filter((type) => RECIPES.some((recipe) => recipe.mainIngredient === type));
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function mondayOf(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekDates(start = state.weekStart) {
  const base = new Date(`${start}T12:00:00`);
  return DAYS.map((_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return date;
  });
}

function defaultState() {
  const weekStart = isoDate(mondayOf());
  return {
    version: 3,
    householdName: 'Our kitchen',
    people: [
      { id: 'p1', name: 'Person 1', targetKcal: 2100, proteinTarget: 85, fibreTarget: 30, ironTarget: 11, calciumTarget: 950, vitaminCTarget: 95, portion: 1 },
      { id: 'p2', name: 'Person 2', targetKcal: 1850, proteinTarget: 72, fibreTarget: 25, ironTarget: 16, calciumTarget: 950, vitaminCTarget: 95, portion: 0.85 },
    ],
    preferences: { mode: 'balanced', diet: 'balanced', region: 'all', focus: 'none', focusStrength: 'moderate', maxTime: 35, strictTime: false, allergens: [] },
    weekStart,
    plan: [],
    pantry: [
      { id: 'pantry-oil', foodId: 'olive-oil', name: 'Olive oil', mode: 'exact', quantity: 450, unit: 'ml', storage: 'Cupboard', status: 'enough' },
      { id: 'pantry-rice', foodId: 'basmati-rice', name: 'Basmati rice', mode: 'exact', quantity: 500, unit: 'g', storage: 'Cupboard', status: 'enough' },
      { id: 'pantry-onions', foodId: 'onions', name: 'Onions', mode: 'count', quantity: 3, unit: 'count', storage: 'Cupboard', status: 'low' },
      { id: 'pantry-spinach', foodId: 'spinach', name: 'Spinach', mode: 'status', quantity: null, unit: 'g', storage: 'Freezer', status: 'low' },
    ],
    shopping: { overrides: {}, suppressed: [], checked: [], states: {}, manualItems: [], selectedEntryIds: [] },
    selectedPlanDay: 0,
    audit: [],
  };
}

function migrateLegacy(next) {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    if (!legacy || !Array.isArray(legacy.checkedPantry)) return next;
    const existingNames = new Set(next.pantry.map((item) => item.name.toLowerCase()));
    for (const name of legacy.checkedPantry) {
      if (!existingNames.has(String(name).toLowerCase())) {
        next.pantry.push({ id: uid('pantry'), foodId: null, name: String(name), mode: 'status', quantity: null, unit: 'count', storage: 'Cupboard', status: 'enough' });
      }
    }
    return next;
  } catch {
    return next;
  }
}

function loadState() {
  const fallback = migrateLegacy(defaultState());
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.version !== 3) return fallback;
    const merged = {
      ...fallback,
      ...saved,
      preferences: { ...fallback.preferences, ...saved.preferences },
      shopping: { ...fallback.shopping, ...saved.shopping },
    };
    if (!Array.isArray(merged.shopping.selectedEntryIds)) merged.shopping.selectedEntryIds = [];
    return merged;
  } catch {
    return fallback;
  }
}

function saveState(message = 'Saved locally') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.getElementById('saveStatus');
  if (status) {
    status.textContent = message;
    clearTimeout(status._timer);
    status._timer = setTimeout(() => { status.textContent = 'Saved locally'; }, 1300);
  }
}

function audit(action, detail) {
  state.audit.unshift({ id: uid('audit'), action, detail, at: new Date().toISOString() });
  state.audit = state.audit.slice(0, 30);
}

function h(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(date, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function displayQuantity(value, unit) {
  const numeric = Number(value);
  if (unit === 'as needed') return 'as needed';
  const rounded = unit === 'g' || unit === 'ml' ? Math.round(numeric / 5) * 5 : engine.round(numeric, 1);
  if (unit === 'g' && rounded >= 1000) return `${engine.round(rounded / 1000, 2)} kg`;
  if (unit === 'ml' && rounded >= 1000) return `${engine.round(rounded / 1000, 2)} l`;
  if (unit === 'count') return `${rounded} ${rounded === 1 ? 'item' : 'items'}`;
  return `${rounded} ${unit}`;
}

function focusWeight() {
  return { gentle: 1.25, moderate: 1.75, strong: 2.5 }[state.preferences.focusStrength] || 1.75;
}

function reasonFor(recipe) {
  if (state.preferences.region && state.preferences.region !== 'all' && recipe.region === state.preferences.region) return `Matches the ${state.preferences.region} regional preference`;
  if (state.preferences.focus !== 'none') return `Strong ${NUTRIENT_META[state.preferences.focus]?.label.toLowerCase() || state.preferences.focus} contribution`;
  if (state.preferences.mode === 'pantry') return 'Prioritizes ingredients already recorded at home';
  if (state.preferences.mode === 'quick') return `Fits the ${state.preferences.maxTime}-minute active-time preference`;
  if (state.preferences.mode === 'batch') return recipe.batchFriendly ? 'Suitable for batch cooking and leftovers' : 'Best available fit';
  return 'Balances nutrition, variety and preparation effort';
}

function rankedRecipes(mealType, recentIds = []) {
  const recentRecipes = recentIds.map((id) => RECIPE_MAP[id]).filter(Boolean);
  const recentRegionCounts = recentRecipes.reduce((map, recipe) => map.set(recipe.region, (map.get(recipe.region) || 0) + 1), new Map());
  const lastTwo = recentRecipes.slice(-2);
  return RECIPES
    .filter((recipe) => recipe.mealSlots?.includes(mealType) || recipe.mealType === mealType)
    .filter((recipe) => state.preferences.diet === 'balanced' || recipe.diets.includes(state.preferences.diet))
    .filter((recipe) => !recipe.allergens.some((allergen) => state.preferences.allergens.includes(allergen)))
    .filter((recipe) => !state.preferences.strictTime || recipe.activeTime <= state.preferences.maxTime)
    .map((recipe) => {
      let score = engine.scoreRecipe(recipe, {
        mode: state.preferences.mode,
        focus: state.preferences.focus,
        focusWeight: focusWeight(),
        diet: state.preferences.diet,
        maxTime: state.preferences.maxTime,
        pantryItems: state.pantry,
        recentRecipeIds: recentIds,
      });
      if (state.preferences.region && state.preferences.region !== 'all' && recipe.region === state.preferences.region) score += 42;
      if (recentIds.slice(-84).includes(recipe.id)) score -= 48;
      score -= (recentRegionCounts.get(recipe.region) || 0) * 4;
      if (lastTwo.some((item) => item.primaryProtein === recipe.primaryProtein && recipe.primaryProtein !== 'mixed')) score -= 16;
      if (lastTwo.some((item) => item.method === recipe.method)) score -= 8;
      return { recipe, score };
    })
    .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name));
}

function generatePlan({ preservePinned = true } = {}) {
  const dates = weekDates();
  const previous = new Map(state.plan.map((entry) => [`${entry.day}|${entry.slot}`, entry]));
  const previousRecipeIds = state.plan.filter((entry) => !entry.skipped && RECIPE_MAP[entry.recipeId]).map((entry) => entry.recipeId);
  state.recipeHistory = [...(state.recipeHistory || []), ...previousRecipeIds].slice(-84);
  state.generationCount = Number(state.generationCount || 0) + 1;
  state.shopping.selectedEntryIds = [];
  const recent = [...state.recipeHistory];
  const next = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    for (const slot of SLOTS) {
      const key = `${isoDate(dates[dayIndex])}|${slot}`;
      const existing = previous.get(key);
      if (preservePinned && existing?.pinned && RECIPE_MAP[existing.recipeId]) {
        next.push(existing);
        recent.push(existing.recipeId);
        continue;
      }
      const ranked = rankedRecipes(slot, recent);
      const pool = ranked.filter((item) => !recent.slice(-14).includes(item.recipe.id)).slice(0, 6);
      const fallbackPool = ranked.filter((item) => !recent.slice(-3).includes(item.recipe.id)).slice(0, 6);
      const candidates = pool.length ? pool : fallbackPool.length ? fallbackPool : ranked.slice(0, 6);
      const choice = candidates[(state.generationCount + dayIndex + SLOTS.indexOf(slot)) % Math.max(candidates.length, 1)];
      if (!choice) continue;
      const people = Object.fromEntries(state.people.map((person) => [person.id, person.portion]));
      const cookServings = engine.round(Object.values(people).reduce((sum, value) => sum + Number(value), 0), 2);
      next.push({
        id: existing?.id || uid('meal'), day: isoDate(dates[dayIndex]), dayIndex, slot,
        recipeId: choice.recipe.id, pinned: false, type: 'recipe', people, cookServings,
        reason: reasonFor(choice.recipe), skipped: false,
      });
      recent.push(choice.recipe.id);
    }
  }
  state.plan = next;
  audit('plan_generated', `${next.length} meal entries generated from ${RECIPES.length} recipes`);
  saveState('Plan updated');
  renderAll();
  showToast('Weekly plan updated. Pinned meals were preserved.');
}

function ensurePlan() {
  const valid = state.plan.length === 21 && state.plan.every((entry) => RECIPE_MAP[entry.recipeId]);
  if (!valid) generatePlan({ preservePinned: false });
}

function planEntriesForDay(index) {
  return state.plan.filter((entry) => entry.dayIndex === index).sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
}

function totalsForPerson(personId) {
  return engine.sumNutrition(state.plan, RECIPE_MAP, personId);
}

function dailyTotals(personId, dayIndex) {
  return engine.sumNutrition(planEntriesForDay(dayIndex), RECIPE_MAP, personId);
}

function averageDaily(personId) {
  const totals = totalsForPerson(personId);
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, engine.round(value / 7, 1)]));
}

function targetFor(person, nutrient) {
  return {
    kcal: person.targetKcal,
    protein: person.proteinTarget,
    fibre: person.fibreTarget,
    iron: person.ironTarget,
    calcium: person.calciumTarget,
    vitaminC: person.vitaminCTarget,
  }[nutrient];
}

function shoppingRows() {
  const selectedPlan = engine.filterSelectedPlanEntries(state.plan, state.shopping.selectedEntryIds);
  const aggregate = engine.aggregateIngredients(selectedPlan, RECIPE_MAP);
  const trimmed = engine.subtractPantry(aggregate, state.pantry);
  const generated = trimmed
    .filter((item) => item.net > 0 || item.checkPantry)
    .filter((item) => !state.shopping.suppressed.includes(item.key))
    .map((item) => {
      const override = state.shopping.overrides[item.key];
      const stateValue = state.shopping.states[item.key] || 'needed';
      return {
        ...item,
        id: item.key,
        displayValue: override?.value ?? item.net,
        displayUnit: override?.unit ?? item.unit,
        manualOverride: Boolean(override),
        checked: state.shopping.checked.includes(item.key),
        state: stateValue,
        manual: false,
      };
    });
  const manual = state.shopping.manualItems.map((item) => ({
    ...item,
    key: item.id,
    gross: null,
    pantryApplied: null,
    net: Number(item.value) || 0,
    displayValue: item.value,
    displayUnit: item.unit,
    sourceMeals: [],
    checkPantry: false,
    checked: state.shopping.checked.includes(item.id),
    state: state.shopping.states[item.id] || 'needed',
    manual: true,
    manualOverride: false,
  }));
  return [...generated, ...manual];
}

function selectedShoppingEntries() {
  return engine.filterSelectedPlanEntries(state.plan, state.shopping.selectedEntryIds);
}
