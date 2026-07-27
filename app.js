(() => {
  'use strict';

  const engine = window.MealPlannerEngine;
  const STORAGE_KEY = 'mealPlannerSpecV3';
  const LEGACY_STORAGE_KEY = 'pamplonaPantryV2';
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const SLOTS = ['breakfast', 'lunch', 'dinner'];
  const NAV_ITEMS = [
    { id: 'today', label: 'Today', icon: '◉' },
    { id: 'plan', label: 'Plan', icon: '▦' },
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

  const RECIPES = [
    {
      id: 'overnight-oats', name: 'Apple walnut overnight oats', mealType: 'breakfast', cuisine: 'European', servings: 2,
      activeTime: 10, batchFriendly: true, diets: ['balanced', 'vegetarian'], allergens: ['milk', 'nuts'], completeness: 92,
      nutrition: { kcal: 435, protein: 18, carbs: 59, fat: 15, fibre: 9, iron: 3.2, calcium: 270, vitaminC: 8 },
      ingredients: [
        { id: 'oats', foodId: 'oats', name: 'Rolled oats', quantity: 140, unit: 'g', category: 'Dry goods' },
        { id: 'yogurt', foodId: 'greek-yogurt', name: 'Greek yogurt', quantity: 300, unit: 'g', category: 'Dairy & alternatives' },
        { id: 'apple', foodId: 'apple', name: 'Apples', quantity: 2, unit: 'count', category: 'Produce' },
        { id: 'walnuts', foodId: 'walnuts', name: 'Walnuts', quantity: 30, unit: 'g', category: 'Dry goods' },
      ],
    },
    {
      id: 'shakshuka', name: 'Shakshuka with wholegrain toast', mealType: 'breakfast', cuisine: 'North African', servings: 2,
      activeTime: 25, batchFriendly: false, diets: ['balanced', 'vegetarian', 'high-protein'], allergens: ['egg', 'gluten'], completeness: 90,
      nutrition: { kcal: 470, protein: 24, carbs: 45, fat: 22, fibre: 9, iron: 5.1, calcium: 170, vitaminC: 58 },
      ingredients: [
        { id: 'eggs', foodId: 'eggs', name: 'Eggs', quantity: 4, unit: 'count', category: 'Dairy & alternatives' },
        { id: 'tomatoes', foodId: 'tomatoes', name: 'Tomatoes', quantity: 500, unit: 'g', category: 'Produce' },
        { id: 'pepper', foodId: 'red-pepper', name: 'Red pepper', quantity: 1, unit: 'count', category: 'Produce' },
        { id: 'bread', foodId: 'wholegrain-bread', name: 'Wholegrain bread', quantity: 4, unit: 'count', category: 'Bakery' },
        { id: 'oil', foodId: 'olive-oil', name: 'Olive oil', quantity: 20, unit: 'ml', category: 'Spices & condiments' },
      ],
    },
    {
      id: 'yogurt-bowl', name: 'Yogurt, berries and seed bowl', mealType: 'breakfast', cuisine: 'Contemporary', servings: 2,
      activeTime: 5, batchFriendly: false, diets: ['balanced', 'vegetarian', 'high-protein'], allergens: ['milk'], completeness: 88,
      nutrition: { kcal: 390, protein: 25, carbs: 42, fat: 14, fibre: 8, iron: 2.8, calcium: 310, vitaminC: 34 },
      ingredients: [
        { id: 'yogurt', foodId: 'greek-yogurt', name: 'Greek yogurt', quantity: 400, unit: 'g', category: 'Dairy & alternatives' },
        { id: 'berries', foodId: 'berries', name: 'Mixed berries', quantity: 240, unit: 'g', category: 'Produce' },
        { id: 'seeds', foodId: 'mixed-seeds', name: 'Mixed seeds', quantity: 40, unit: 'g', category: 'Dry goods' },
        { id: 'oats', foodId: 'oats', name: 'Rolled oats', quantity: 70, unit: 'g', category: 'Dry goods' },
      ],
    },
    {
      id: 'chickpea-toast', name: 'Lemon chickpea toast', mealType: 'breakfast', cuisine: 'Mediterranean-inspired', servings: 2,
      activeTime: 12, batchFriendly: false, diets: ['balanced', 'vegetarian', 'vegan'], allergens: ['gluten'], completeness: 84,
      nutrition: { kcal: 455, protein: 18, carbs: 67, fat: 13, fibre: 14, iron: 5.7, calcium: 110, vitaminC: 21 },
      ingredients: [
        { id: 'chickpeas', foodId: 'canned-chickpeas', name: 'Canned chickpeas', quantity: 240, unit: 'g', category: 'Canned foods' },
        { id: 'bread', foodId: 'wholegrain-bread', name: 'Wholegrain bread', quantity: 4, unit: 'count', category: 'Bakery' },
        { id: 'lemon', foodId: 'lemon', name: 'Lemon', quantity: 1, unit: 'count', category: 'Produce' },
        { id: 'spinach', foodId: 'spinach', name: 'Spinach', quantity: 100, unit: 'g', category: 'Produce' },
      ],
    },
    {
      id: 'lentil-soup', name: 'Lentil and vegetable soup', mealType: 'lunch', cuisine: 'Mediterranean', servings: 4,
      activeTime: 20, batchFriendly: true, diets: ['balanced', 'vegetarian', 'vegan'], allergens: [], completeness: 94,
      nutrition: { kcal: 510, protein: 25, carbs: 75, fat: 11, fibre: 20, iron: 7.2, calcium: 125, vitaminC: 42 },
      ingredients: [
        { id: 'lentils', foodId: 'dry-lentils', name: 'Dry lentils', quantity: 320, unit: 'g', category: 'Dry goods' },
        { id: 'carrots', foodId: 'carrots', name: 'Carrots', quantity: 300, unit: 'g', category: 'Produce' },
        { id: 'onions', foodId: 'onions', name: 'Onions', quantity: 2, unit: 'count', category: 'Produce' },
        { id: 'tomatoes', foodId: 'canned-tomatoes', name: 'Canned tomatoes', quantity: 400, unit: 'g', category: 'Canned foods' },
        { id: 'oil', foodId: 'olive-oil', name: 'Olive oil', quantity: 30, unit: 'ml', category: 'Spices & condiments' },
      ],
    },
    {
      id: 'chicken-wrap', name: 'Chicken salad wraps', mealType: 'lunch', cuisine: 'Contemporary', servings: 2,
      activeTime: 20, batchFriendly: false, diets: ['balanced', 'high-protein'], allergens: ['gluten', 'milk'], completeness: 90,
      nutrition: { kcal: 610, protein: 46, carbs: 57, fat: 21, fibre: 9, iron: 3.1, calcium: 190, vitaminC: 38 },
      ingredients: [
        { id: 'chicken', foodId: 'chicken-breast', name: 'Chicken breast', quantity: 320, unit: 'g', category: 'Meat, fish & alternatives' },
        { id: 'wraps', foodId: 'wholegrain-wraps', name: 'Wholegrain wraps', quantity: 4, unit: 'count', category: 'Bakery' },
        { id: 'lettuce', foodId: 'lettuce', name: 'Lettuce', quantity: 160, unit: 'g', category: 'Produce' },
        { id: 'tomatoes', foodId: 'tomatoes', name: 'Tomatoes', quantity: 250, unit: 'g', category: 'Produce' },
        { id: 'yogurt', foodId: 'greek-yogurt', name: 'Greek yogurt', quantity: 120, unit: 'g', category: 'Dairy & alternatives' },
      ],
    },
    {
      id: 'tuna-bean-salad', name: 'Tuna and white bean salad', mealType: 'lunch', cuisine: 'Mediterranean', servings: 2,
      activeTime: 12, batchFriendly: false, diets: ['balanced', 'high-protein'], allergens: ['fish'], completeness: 91,
      nutrition: { kcal: 545, protein: 41, carbs: 48, fat: 20, fibre: 13, iron: 5.2, calcium: 135, vitaminC: 45 },
      ingredients: [
        { id: 'tuna', foodId: 'canned-tuna', name: 'Canned tuna', quantity: 220, unit: 'g', category: 'Meat, fish & alternatives' },
        { id: 'beans', foodId: 'canned-white-beans', name: 'Canned white beans', quantity: 300, unit: 'g', category: 'Canned foods' },
        { id: 'tomatoes', foodId: 'tomatoes', name: 'Tomatoes', quantity: 250, unit: 'g', category: 'Produce' },
        { id: 'pepper', foodId: 'red-pepper', name: 'Red pepper', quantity: 1, unit: 'count', category: 'Produce' },
        { id: 'oil', foodId: 'olive-oil', name: 'Olive oil', quantity: 25, unit: 'ml', category: 'Spices & condiments' },
      ],
    },
    {
      id: 'quinoa-bowl', name: 'Quinoa chickpea vegetable bowl', mealType: 'lunch', cuisine: 'Andean-inspired', servings: 2,
      activeTime: 25, batchFriendly: true, diets: ['balanced', 'vegetarian', 'vegan'], allergens: [], completeness: 87,
      nutrition: { kcal: 590, protein: 22, carbs: 83, fat: 20, fibre: 17, iron: 6.4, calcium: 145, vitaminC: 72 },
      ingredients: [
        { id: 'quinoa', foodId: 'quinoa', name: 'Quinoa', quantity: 160, unit: 'g', category: 'Dry goods' },
        { id: 'chickpeas', foodId: 'canned-chickpeas', name: 'Canned chickpeas', quantity: 240, unit: 'g', category: 'Canned foods' },
        { id: 'broccoli', foodId: 'broccoli', name: 'Broccoli', quantity: 300, unit: 'g', category: 'Produce' },
        { id: 'pepper', foodId: 'red-pepper', name: 'Red pepper', quantity: 1, unit: 'count', category: 'Produce' },
        { id: 'oil', foodId: 'olive-oil', name: 'Olive oil', quantity: 25, unit: 'ml', category: 'Spices & condiments' },
      ],
    },
    {
      id: 'chicken-biryani', name: 'Chicken biryani with cucumber salad', mealType: 'dinner', cuisine: 'Pakistani', servings: 4,
      activeTime: 35, batchFriendly: true, diets: ['balanced', 'high-protein'], allergens: ['milk'], completeness: 89,
      nutrition: { kcal: 735, protein: 44, carbs: 91, fat: 21, fibre: 7, iron: 4.8, calcium: 155, vitaminC: 24 },
      ingredients: [
        { id: 'chicken', foodId: 'chicken-thigh', name: 'Chicken thigh', quantity: 700, unit: 'g', category: 'Meat, fish & alternatives' },
        { id: 'rice', foodId: 'basmati-rice', name: 'Basmati rice', quantity: 360, unit: 'g', category: 'Dry goods' },
        { id: 'onions', foodId: 'onions', name: 'Onions', quantity: 3, unit: 'count', category: 'Produce' },
        { id: 'yogurt', foodId: 'greek-yogurt', name: 'Greek yogurt', quantity: 200, unit: 'g', category: 'Dairy & alternatives' },
        { id: 'cucumber', foodId: 'cucumber', name: 'Cucumber', quantity: 1, unit: 'count', category: 'Produce' },
      ],
    },
    {
      id: 'salmon-potatoes', name: 'Oven salmon, potatoes and green beans', mealType: 'dinner', cuisine: 'European', servings: 2,
      activeTime: 15, batchFriendly: false, diets: ['balanced', 'high-protein'], allergens: ['fish'], completeness: 93,
      nutrition: { kcal: 690, protein: 43, carbs: 59, fat: 30, fibre: 10, iron: 3.4, calcium: 105, vitaminC: 44 },
      ingredients: [
        { id: 'salmon', foodId: 'salmon', name: 'Salmon fillets', quantity: 360, unit: 'g', category: 'Meat, fish & alternatives' },
        { id: 'potatoes', foodId: 'potatoes', name: 'Potatoes', quantity: 600, unit: 'g', category: 'Produce' },
        { id: 'beans', foodId: 'green-beans', name: 'Green beans', quantity: 300, unit: 'g', category: 'Produce' },
        { id: 'oil', foodId: 'olive-oil', name: 'Olive oil', quantity: 25, unit: 'ml', category: 'Spices & condiments' },
      ],
    },
    {
      id: 'chana-masala', name: 'Chana masala with spinach and rice', mealType: 'dinner', cuisine: 'Indian', servings: 4,
      activeTime: 25, batchFriendly: true, diets: ['balanced', 'vegetarian', 'vegan'], allergens: [], completeness: 91,
      nutrition: { kcal: 630, protein: 24, carbs: 99, fat: 17, fibre: 19, iron: 8.1, calcium: 190, vitaminC: 41 },
      ingredients: [
        { id: 'chickpeas', foodId: 'canned-chickpeas', name: 'Canned chickpeas', quantity: 600, unit: 'g', category: 'Canned foods' },
        { id: 'rice', foodId: 'basmati-rice', name: 'Basmati rice', quantity: 300, unit: 'g', category: 'Dry goods' },
        { id: 'spinach', foodId: 'spinach', name: 'Spinach', quantity: 300, unit: 'g', category: 'Produce' },
        { id: 'tomatoes', foodId: 'canned-tomatoes', name: 'Canned tomatoes', quantity: 400, unit: 'g', category: 'Canned foods' },
        { id: 'onions', foodId: 'onions', name: 'Onions', quantity: 2, unit: 'count', category: 'Produce' },
      ],
    },
    {
      id: 'turkey-meatballs', name: 'Turkey meatballs with tomato pasta', mealType: 'dinner', cuisine: 'Italian-inspired', servings: 4,
      activeTime: 30, batchFriendly: true, diets: ['balanced', 'high-protein'], allergens: ['gluten', 'egg'], completeness: 86,
      nutrition: { kcal: 710, protein: 48, carbs: 84, fat: 21, fibre: 10, iron: 5.3, calcium: 135, vitaminC: 32 },
      ingredients: [
        { id: 'turkey', foodId: 'turkey-mince', name: 'Turkey mince', quantity: 650, unit: 'g', category: 'Meat, fish & alternatives' },
        { id: 'pasta', foodId: 'wholegrain-pasta', name: 'Wholegrain pasta', quantity: 360, unit: 'g', category: 'Dry goods' },
        { id: 'passata', foodId: 'tomato-passata', name: 'Tomato passata', quantity: 600, unit: 'ml', category: 'Canned foods' },
        { id: 'egg', foodId: 'eggs', name: 'Eggs', quantity: 1, unit: 'count', category: 'Dairy & alternatives' },
        { id: 'onion', foodId: 'onions', name: 'Onions', quantity: 1, unit: 'count', category: 'Produce' },
      ],
    },
  ];
  const RECIPE_MAP = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

  let state = loadState();
  let activeView = 'today';
  let activeNutritionPerson = state.people[0]?.id || 'p1';
  let toastTimer;

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
    return date.toISOString().slice(0, 10);
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
      preferences: { mode: 'balanced', diet: 'balanced', focus: 'none', focusStrength: 'moderate', maxTime: 35, strictTime: false, allergens: [] },
      weekStart,
      plan: [],
      pantry: [
        { id: 'pantry-oil', foodId: 'olive-oil', name: 'Olive oil', mode: 'exact', quantity: 450, unit: 'ml', storage: 'Cupboard', status: 'enough' },
        { id: 'pantry-rice', foodId: 'basmati-rice', name: 'Basmati rice', mode: 'exact', quantity: 500, unit: 'g', storage: 'Cupboard', status: 'enough' },
        { id: 'pantry-onions', foodId: 'onions', name: 'Onions', mode: 'count', quantity: 3, unit: 'count', storage: 'Cupboard', status: 'low' },
        { id: 'pantry-spinach', foodId: 'spinach', name: 'Spinach', mode: 'status', quantity: null, unit: 'g', storage: 'Freezer', status: 'low' },
      ],
      shopping: { overrides: {}, suppressed: [], checked: [], states: {}, manualItems: [] },
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
      return { ...fallback, ...saved, preferences: { ...fallback.preferences, ...saved.preferences }, shopping: { ...fallback.shopping, ...saved.shopping } };
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
    if (state.preferences.focus !== 'none') return `Strong ${NUTRIENT_META[state.preferences.focus]?.label.toLowerCase() || state.preferences.focus} contribution`;
    if (state.preferences.mode === 'pantry') return 'Prioritizes ingredients already recorded at home';
    if (state.preferences.mode === 'quick') return `Fits the ${state.preferences.maxTime}-minute active-time preference`;
    if (state.preferences.mode === 'batch') return recipe.batchFriendly ? 'Suitable for batch cooking and leftovers' : 'Best available fit';
    return 'Balances nutrition, variety and preparation effort';
  }

  function rankedRecipes(mealType, recentIds = []) {
    return RECIPES
      .filter((recipe) => recipe.mealType === mealType)
      .filter((recipe) => state.preferences.diet === 'balanced' || recipe.diets.includes(state.preferences.diet))
      .filter((recipe) => !recipe.allergens.some((allergen) => state.preferences.allergens.includes(allergen)))
      .filter((recipe) => !state.preferences.strictTime || recipe.activeTime <= state.preferences.maxTime)
      .map((recipe) => ({ recipe, score: engine.scoreRecipe(recipe, {
        mode: state.preferences.mode,
        focus: state.preferences.focus,
        focusWeight: focusWeight(),
        diet: state.preferences.diet,
        maxTime: state.preferences.maxTime,
        pantryItems: state.pantry,
        recentRecipeIds: recentIds,
      }) }))
      .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name));
  }

  function generatePlan({ preservePinned = true } = {}) {
    const dates = weekDates();
    const previous = new Map(state.plan.map((entry) => [`${entry.day}|${entry.slot}`, entry]));
    const recent = [];
    const next = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      for (const slot of SLOTS) {
        const key = `${isoDate(dates[dayIndex])}|${slot}`;
        const existing = previous.get(key);
        if (preservePinned && existing?.pinned) {
          next.push(existing);
          recent.push(existing.recipeId);
          continue;
        }
        const ranked = rankedRecipes(slot, recent.slice(-4));
        const choice = ranked.find((item) => !recent.slice(-2).includes(item.recipe.id)) || ranked[0];
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
    audit('plan_generated', `${next.length} meal entries generated`);
    saveState('Plan updated');
    renderAll();
    showToast('Weekly plan updated. Pinned meals were preserved.');
  }

  function ensurePlan() {
    if (!state.plan.length) generatePlan({ preservePinned: false });
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
    const aggregate = engine.aggregateIngredients(state.plan, RECIPE_MAP);
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

  function renderNav() {
    const desktop = NAV_ITEMS.map((item) => navButton(item)).join('');
    const mobileOrder = ['today', 'plan', 'shop', 'pantry', 'more'];
    const mobileItems = mobileOrder.map((id) => NAV_ITEMS.find((item) => item.id === id));
    document.getElementById('desktopNav').innerHTML = desktop;
    document.getElementById('mobileNav').innerHTML = mobileItems.map((item) => navButton(item)).join('');
  }

  function navButton(item) {
    return `<button class="nav-button ${activeView === item.id ? 'active' : ''}" type="button" data-action="navigate" data-view="${h(item.id)}" aria-current="${activeView === item.id ? 'page' : 'false'}"><span class="nav-icon" aria-hidden="true">${h(item.icon)}</span><span>${h(item.label)}</span></button>`;
  }

  function renderToday() {
    const dates = weekDates();
    const todayIso = isoDate(new Date());
    const index = Math.max(0, dates.findIndex((date) => isoDate(date) === todayIso));
    const entries = planEntriesForDay(index);
    const firstPerson = state.people[0];
    const shopping = shoppingRows();
    const unchecked = shopping.filter((item) => !item.checked && item.state !== 'skipped').length;
    const useSoon = state.pantry.filter((item) => item.useSoon && item.useSoon <= isoDate(new Date(Date.now() + 3 * 86400000))).length;
    const avg = averageDaily(firstPerson.id);

    document.getElementById('view-today').innerHTML = `
      <div class="view-header">
        <div><p class="eyebrow">${h(formatDate(dates[index], { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h2>Today in ${h(state.householdName)}</h2><p>Meals, preparation cues and nutrition at a glance.</p></div>
        <button class="button secondary" type="button" data-action="navigate" data-view="plan">Open weekly plan</button>
      </div>
      <div class="stat-grid">
        <article class="stat-card"><small>Planned meals</small><strong>${entries.filter((entry) => !entry.skipped).length}</strong><span>${entries.some((entry) => entry.pinned) ? 'Includes pinned choices' : 'All editable'}</span></article>
        <article class="stat-card"><small>Shopping remaining</small><strong>${unchecked}</strong><span>${shopping.length ? 'Across the active list' : 'Nothing currently required'}</span></article>
        <article class="stat-card"><small>Pantry use-soon</small><strong>${useSoon}</strong><span>Based on household-entered dates</span></article>
        <article class="stat-card"><small>Average energy</small><strong>${Math.round(avg.kcal || 0)}</strong><span>kcal/day for ${h(firstPerson.name)}</span></article>
      </div>
      <div class="grid two" style="margin-top:18px">
        <section class="panel">
          <div class="panel-header"><div><h3>Meals</h3><p>Portions reflect each person profile.</p></div></div>
          <div class="today-meals">
            ${entries.map((entry) => {
              const recipe = RECIPE_MAP[entry.recipeId];
              const servings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0);
              return `<article class="today-meal"><div class="slot">${h(entry.slot)}</div><div><strong>${h(recipe.name)}</strong><span>${servings.toFixed(1)} household servings · ${recipe.activeTime} min active</span></div><div class="meal-kcal">${recipe.nutrition.kcal} kcal/serving</div></article>`;
            }).join('') || '<div class="empty-state">No meals planned for this day.</div>'}
          </div>
        </section>
        <section class="panel soft-panel">
          <div class="panel-header"><div><h3>Preparation</h3><p>Practical cues derived from the current recipes.</p></div></div>
          <div class="stack">
            ${entries.map((entry) => {
              const recipe = RECIPE_MAP[entry.recipeId];
              const prep = recipe.batchFriendly ? 'Consider cooking extra for leftovers.' : `Allow about ${recipe.activeTime} minutes of active preparation.`;
              return `<div class="data-quality"><span aria-hidden="true">→</span><div><strong>${h(recipe.name)}</strong><br>${h(prep)}</div></div>`;
            }).join('')}
          </div>
        </section>
      </div>
      <section class="panel warm-panel">
        <div class="panel-header"><div><h3>Current planning priority</h3><p>${state.preferences.focus === 'none' ? 'Balanced planning with no temporary nutrient focus.' : `${h(NUTRIENT_META[state.preferences.focus]?.label || state.preferences.focus)} focus at ${h(state.preferences.focusStrength)} strength.`}</p></div><button class="button secondary small" type="button" data-action="navigate" data-view="nutrition">Review nutrition</button></div>
        <div class="disclaimer">Nutrition values are estimates based on structured recipe quantities and planned portions. They support meal planning and are not medical advice.</div>
      </section>`;
  }

  function renderPlan() {
    const dates = weekDates();
    const totalMeals = state.plan.filter((entry) => !entry.skipped).length;
    const cookingEvents = state.plan.filter((entry) => !entry.skipped && entry.type !== 'leftover').length;
    document.getElementById('view-plan').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Weekly planner</p><h2>Plan meals without losing control</h2><p>Suggestions remain editable. Pinned meals survive regeneration.</p></div></div>
      <section class="panel soft-panel">
        <div class="plan-controls">
          <label>Planning mode<select id="planningMode">
            ${option('balanced', 'Balanced', state.preferences.mode)}${option('pantry', 'Use pantry first', state.preferences.mode)}${option('quick', 'Quick week', state.preferences.mode)}${option('batch', 'Batch cooking', state.preferences.mode)}${option('variety', 'High variety', state.preferences.mode)}
          </select></label>
          <label>Dietary pattern<select id="dietMode">${option('balanced', 'Balanced', state.preferences.diet)}${option('vegetarian', 'Vegetarian', state.preferences.diet)}${option('vegan', 'Vegan', state.preferences.diet)}${option('high-protein', 'High protein', state.preferences.diet)}</select></label>
          <label>Nutrient focus<select id="nutrientFocus">${option('none', 'No temporary focus', state.preferences.focus)}${option('protein', 'Protein', state.preferences.focus)}${option('fibre', 'Fibre', state.preferences.focus)}${option('iron', 'Iron', state.preferences.focus)}${option('calcium', 'Calcium', state.preferences.focus)}${option('vitaminC', 'Vitamin C', state.preferences.focus)}</select></label>
          <label>Focus strength<select id="focusStrength">${option('gentle', 'Gentle', state.preferences.focusStrength)}${option('moderate', 'Moderate', state.preferences.focusStrength)}${option('strong', 'Strong', state.preferences.focusStrength)}</select></label>
          <button class="button" type="button" data-action="generate-plan">Suggest meals</button>
        </div>
        <p class="help">Allergies and exclusions should become hard constraints in the backend phase. This preview currently applies the selected dietary pattern and time preference.</p>
      </section>
      <div class="week-strip" role="tablist" aria-label="Week days">
        ${dates.map((date, index) => `<button type="button" class="day-tab ${state.selectedPlanDay === index ? 'active' : ''}" data-action="select-day" data-day-index="${index}" role="tab" aria-selected="${state.selectedPlanDay === index}"><span>${h(formatDate(date, { weekday: 'short' }))}</span><strong>${h(formatDate(date, { day: 'numeric' }))}</strong></button>`).join('')}
      </div>
      <section class="plan-grid" id="planGrid" aria-label="Weekly meal plan">
        ${dates.map((date, dayIndex) => `
          <article class="day-column" id="plan-day-${dayIndex}">
            <h3>${h(formatDate(date, { weekday: 'short' }))}<span>${h(formatDate(date, { day: 'numeric', month: 'short' }))}</span></h3>
            ${planEntriesForDay(dayIndex).map((entry) => mealCard(entry)).join('')}
          </article>`).join('')}
      </section>
      <section class="panel" style="margin-top:18px">
        <div class="panel-header"><div><h3>Plan summary</h3><p>Derived from the current editable plan.</p></div></div>
        <div class="stat-grid">
          <article class="stat-card"><small>Planned entries</small><strong>${totalMeals}</strong><span>Across seven days</span></article>
          <article class="stat-card"><small>Cooking events</small><strong>${cookingEvents}</strong><span>Leftovers can reduce this later</span></article>
          <article class="stat-card"><small>Pinned meals</small><strong>${state.plan.filter((entry) => entry.pinned).length}</strong><span>Protected on regeneration</span></article>
          <article class="stat-card"><small>Nutrition data</small><strong>${engine.completeness(state.plan, RECIPE_MAP).score}%</strong><span>${h(engine.completeness(state.plan, RECIPE_MAP).status)}</span></article>
        </div>
      </section>`;
  }

  function mealCard(entry) {
    const recipe = RECIPE_MAP[entry.recipeId];
    const totalServings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0);
    return `<div class="meal-card ${entry.skipped ? 'muted' : ''}" data-entry-id="${h(entry.id)}">
      <div class="meal-card-header"><span class="meal-slot">${h(entry.slot)}</span><button type="button" class="icon-button ${entry.pinned ? 'active' : ''}" data-action="toggle-pin" data-entry-id="${h(entry.id)}" aria-label="${entry.pinned ? 'Unpin' : 'Pin'} ${h(recipe.name)}">${entry.pinned ? '◆' : '◇'}</button></div>
      <strong class="meal-name">${h(entry.skipped ? 'Meal skipped' : recipe.name)}</strong>
      ${entry.skipped ? '<span class="meal-meta">No ingredients or nutrition allocated</span>' : `<span class="meal-meta">${recipe.activeTime} min active · ${recipe.nutrition.kcal} kcal/serving</span><span class="reason">${h(entry.reason || reasonFor(recipe))}</span>`}
      <div class="portion-control" aria-label="Household serving adjustment">
        <button type="button" data-action="adjust-serving" data-entry-id="${h(entry.id)}" data-delta="-0.25" aria-label="Reduce servings">−</button>
        <span>${totalServings.toFixed(2)} servings</span>
        <button type="button" data-action="adjust-serving" data-entry-id="${h(entry.id)}" data-delta="0.25" aria-label="Increase servings">+</button>
      </div>
      <div class="meal-actions">
        <button class="button secondary small" type="button" data-action="swap-meal" data-entry-id="${h(entry.id)}">Swap</button>
        <button class="button ghost small" type="button" data-action="toggle-skip" data-entry-id="${h(entry.id)}">${entry.skipped ? 'Restore' : 'Skip'}</button>
      </div>
    </div>`;
  }

  function option(value, label, selected) {
    return `<option value="${h(value)}" ${value === selected ? 'selected' : ''}>${h(label)}</option>`;
  }

  function renderNutrition() {
    const person = state.people.find((item) => item.id === activeNutritionPerson) || state.people[0];
    const average = averageDaily(person.id);
    const tracked = ['kcal', 'protein', 'fibre', 'iron', 'calcium', 'vitaminC'];
    const quality = engine.completeness(state.plan, RECIPE_MAP);
    const dates = weekDates();
    document.getElementById('view-nutrition').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Nutrition dashboard</p><h2>Daily detail, weekly context</h2><p>Weekly averages reduce the pressure of interpreting one imperfect day in isolation.</p></div></div>
      <section class="panel">
        <div class="nutrient-tabs" role="tablist" aria-label="Person profiles">
          ${state.people.map((item) => `<button type="button" class="pill-button ${item.id === person.id ? 'active' : ''}" data-action="select-nutrition-person" data-person-id="${h(item.id)}" role="tab" aria-selected="${item.id === person.id}">${h(item.name)}</button>`).join('')}
        </div>
        <div class="nutrient-list">
          ${tracked.map((nutrient) => nutrientRow(nutrient, average[nutrient], targetFor(person, nutrient))).join('')}
        </div>
      </section>
      <div class="grid two" style="margin-top:18px">
        <section class="panel">
          <div class="panel-header"><div><h3>Seven-day detail</h3><p>Planned intake per day for ${h(person.name)}.</p></div></div>
          <div style="overflow-x:auto"><table class="daily-table"><thead><tr><th>Day</th><th>Energy</th><th>Protein</th><th>Fibre</th><th>Iron</th></tr></thead><tbody>
            ${dates.map((date, index) => {
              const totals = dailyTotals(person.id, index);
              return `<tr><td>${h(formatDate(date, { weekday: 'short' }))}</td><td>${Math.round(totals.kcal || 0)} kcal</td><td>${engine.round(totals.protein || 0, 1)} g</td><td>${engine.round(totals.fibre || 0, 1)} g</td><td>${engine.round(totals.iron || 0, 1)} mg</td></tr>`;
            }).join('')}
          </tbody></table></div>
        </section>
        <section class="panel soft-panel">
          <div class="panel-header"><div><h3>Data quality</h3><p>Missing values are not treated as zero.</p></div></div>
          <div class="data-quality"><span aria-hidden="true">◎</span><div><strong>${h(quality.status)} · ${quality.score}%</strong><br>${quality.missing} planned recipe entries use partially complete estimates.</div></div>
          <div class="disclaimer" style="margin-top:14px">Nutrition values are estimates based on food-composition records, ingredient quantities, and planned portions. This tool supports meal planning and is not medical advice.</div>
          <div class="button-row"><button class="button secondary" type="button" data-action="navigate" data-view="more">Edit person targets</button></div>
        </section>
      </div>`;
  }

  function nutrientRow(nutrient, actual = 0, target = 0) {
    const meta = NUTRIENT_META[nutrient];
    const percent = target ? Math.round((actual / target) * 100) : null;
    const width = percent == null ? 0 : Math.min(percent, 130);
    const statusClass = percent == null ? 'low' : percent < 70 ? 'low' : percent < 90 ? 'near' : '';
    const status = percent == null ? 'Target not configured' : percent < 70 ? 'Below planning target' : percent < 90 ? 'Near target' : percent <= 120 ? 'Within planning range' : 'Above planning target';
    return `<div class="nutrient-row"><div class="nutrient-label"><strong>${h(meta.label)}</strong><span>${h(status)}</span></div><div class="progress-track" aria-label="${h(meta.label)} ${percent ?? 0}% of target"><div class="progress-fill ${statusClass}" style="width:${width}%"></div></div><div class="nutrient-value"><strong>${Number(actual).toFixed(meta.decimals)}</strong> / ${target || '—'} ${h(meta.unit)}</div></div>`;
  }

  function renderPantry() {
    document.getElementById('view-pantry').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Shared pantry model</p><h2>Record exact amounts or practical uncertainty</h2><p>Exact quantities are subtracted. “Low” and unknown states trigger a check instead of a false deduction.</p></div></div>
      <section class="panel soft-panel">
        <form id="pantryForm" class="pantry-form">
          <label>Item name<input name="name" required placeholder="e.g. Red lentils" /></label>
          <label>Quantity<input name="quantity" inputmode="decimal" type="number" min="0" step="0.1" placeholder="500" /></label>
          <label>Unit<select name="unit">${option('g', 'g', 'g')}${option('ml', 'ml', 'g')}${option('count', 'count', 'g')}</select></label>
          <label>Quantity mode<select name="mode">${option('exact', 'Exact', 'exact')}${option('count', 'Count', 'exact')}${option('status', 'Status only', 'exact')}</select></label>
          <label>Status<select name="status">${option('plenty', 'Plenty', 'enough')}${option('enough', 'Enough', 'enough')}${option('low', 'Low', 'enough')}${option('out', 'Out', 'enough')}</select></label>
          <button class="button" type="submit">Add item</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>Pantry inventory</h3><p>${state.pantry.length} recorded items · local preview</p></div><button class="button secondary small" type="button" data-action="share-pantry">Share pantry</button></div>
        <div class="pantry-list">
          ${state.pantry.map((item) => pantryRow(item)).join('') || '<div class="empty-state">No pantry items yet.</div>'}
        </div>
      </section>`;
  }

  function pantryRow(item) {
    const quantityText = item.mode === 'status' ? 'Quantity not specified' : displayQuantity(item.quantity || 0, item.unit);
    const statusClass = item.status === 'low' ? 'warning' : item.status === 'out' ? 'muted' : '';
    return `<article class="pantry-row">
      <div class="pantry-name"><strong>${h(item.name)}</strong><span>${h(item.storage || 'Cupboard')} · updated locally</span></div>
      <div>${h(quantityText)}</div>
      <span class="status-badge ${statusClass}">${h(item.status || item.mode)}</span>
      <label>Use soon<input type="date" value="${h(item.useSoon || '')}" data-action="update-use-soon" data-pantry-id="${h(item.id)}" /></label>
      <div class="pantry-actions"><button type="button" class="icon-button" data-action="delete-pantry" data-pantry-id="${h(item.id)}" aria-label="Remove ${h(item.name)}">×</button></div>
    </article>`;
  }

  function renderShop() {
    const rows = shoppingRows();
    const filtered = rows.filter((item) => {
      const filter = state.shopping.filter || 'all';
      if (filter === 'unchecked') return !item.checked;
      if (filter === 'check-pantry') return item.checkPantry;
      return true;
    });
    const grouped = Object.groupBy ? Object.groupBy(filtered, (item) => item.category || 'Manual') : filtered.reduce((groups, item) => {
      const key = item.category || 'Manual';
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
    const categories = Object.keys(grouped).sort();
    const remaining = rows.filter((item) => !item.checked && item.state !== 'skipped').length;
    document.getElementById('view-shop').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Active shopping list</p><h2>Trimmed, traceable and editable</h2><p>Every generated line preserves gross need, pantry deduction and source meals.</p></div><button class="button secondary" type="button" data-action="print">Print list</button></div>
      <section class="panel soft-panel">
        <div class="shopping-toolbar">
          <input id="shoppingSearch" placeholder="Search shopping list" value="${h(state.shopping.search || '')}" />
          <select id="shoppingFilter" aria-label="Shopping list filter">${option('all', 'All items', state.shopping.filter || 'all')}${option('unchecked', 'Unchecked', state.shopping.filter || 'all')}${option('check-pantry', 'Check pantry', state.shopping.filter || 'all')}</select>
          <button class="button" type="button" data-action="share-shopping">Share list</button>
        </div>
        <form id="manualShoppingForm" class="pantry-form">
          <label>Manual item<input name="name" required placeholder="e.g. Dish soap" /></label>
          <label>Quantity<input name="value" inputmode="decimal" type="number" min="0" step="0.1" value="1" /></label>
          <label>Unit<select name="unit">${option('count', 'count', 'count')}${option('g', 'g', 'count')}${option('ml', 'ml', 'count')}</select></label>
          <label>Category<input name="category" value="Household & manual" /></label>
          <span></span><button class="button secondary" type="submit">Add manual item</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>${remaining} items remaining</h3><p>Manual changes are preserved when the list refreshes.</p></div><button class="button secondary small" type="button" data-action="complete-shopping">Complete checked items</button></div>
        <div class="shopping-groups">
          ${categories.map((category) => shoppingCategory(category, grouped[category])).join('') || '<div class="empty-state">The current plan is fully covered by the pantry.</div>'}
        </div>
      </section>`;
  }

  function shoppingCategory(category, items) {
    const search = (state.shopping.search || '').toLowerCase();
    const visible = items.filter((item) => !search || item.name.toLowerCase().includes(search));
    if (!visible.length) return '';
    return `<section class="shopping-category"><h3>${h(category)}<span>${visible.length} items</span></h3>${visible.map((item) => shoppingRow(item)).join('')}</section>`;
  }

  function shoppingRow(item) {
    const sources = item.sourceMeals?.map((source) => source.recipeName).filter((name, index, array) => array.indexOf(name) === index).slice(0, 2) || [];
    const derivation = item.manual
      ? 'Manual household item'
      : `Gross ${displayQuantity(item.gross, item.unit)} − pantry ${displayQuantity(item.pantryApplied, item.unit)}${item.checkPantry ? ' · pantry quantity uncertain' : ''}`;
    return `<article class="shopping-row ${item.checked ? 'checked' : ''}">
      <input class="check-control" type="checkbox" ${item.checked ? 'checked' : ''} data-action="toggle-shopping" data-item-id="${h(item.id)}" aria-label="Check ${h(item.name)}" />
      <div class="shopping-name"><strong>${h(item.name)}${item.manual ? '<span class="manual-badge">manual</span>' : ''}</strong><span>${sources.length ? `For ${h(sources.join(', '))}` : 'Added by household'}</span></div>
      <div class="quantity-editor"><input type="number" min="0" step="0.1" value="${h(item.displayValue)}" data-action="edit-shopping-quantity" data-item-id="${h(item.id)}" data-manual="${item.manual}" aria-label="Quantity for ${h(item.name)}" /><select data-action="edit-shopping-unit" data-item-id="${h(item.id)}" data-manual="${item.manual}" aria-label="Unit for ${h(item.name)}">${option('g', 'g', item.displayUnit)}${option('ml', 'ml', item.displayUnit)}${option('count', 'count', item.displayUnit)}</select></div>
      <select class="shopping-state" data-action="change-shopping-state" data-item-id="${h(item.id)}" aria-label="State for ${h(item.name)}">${option('needed', 'Needed', item.state)}${option('unavailable', 'Unavailable', item.state)}${option('skipped', 'Skipped', item.state)}${option('already-have', 'Already have', item.state)}</select>
      <button type="button" class="icon-button" data-action="remove-shopping" data-item-id="${h(item.id)}" data-manual="${item.manual}" aria-label="Remove ${h(item.name)}">×</button>
      <div class="shopping-derivation">${h(derivation)}${item.manualOverride ? ' · manual override preserved' : ''}</div>
    </article>`;
  }

  function renderMore() {
    document.getElementById('view-more').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Household and settings</p><h2>Profiles, targets and implementation status</h2><p>Person profiles are separate from account membership, as required by the product model.</p></div></div>
      <section class="panel">
        <div class="panel-header"><div><h3>Person profiles</h3><p>Targets are planning defaults and remain editable.</p></div><button class="button secondary small" type="button" data-action="add-person">Add person</button></div>
        <div class="grid two">${state.people.map((person) => profileCard(person)).join('')}</div>
      </section>
      <section class="panel soft-panel">
        <div class="panel-header"><div><h3>What this branch implements</h3><p>A working static vertical slice, not a fabricated production backend.</p></div></div>
        <div class="implementation-list">
          ${implementationItem('Responsive app shell and mobile navigation', 'Implemented')}
          ${implementationItem('Editable seven-day plan with pin, swap, skip and portions', 'Implemented')}
          ${implementationItem('Daily and weekly nutrition calculations', 'Implemented')}
          ${implementationItem('Exact and uncertain pantry states', 'Implemented')}
          ${implementationItem('Pantry-trimmed shopping list with provenance', 'Implemented')}
          ${implementationItem('PWA shell and offline read/edit resilience', 'Implemented')}
          ${implementationItem('Supabase accounts, roles, realtime and RLS', 'Backend phase')}
          ${implementationItem('USDA/OFF food mapping and EFSA seed data', 'Backend phase')}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>Data controls</h3><p>The preview stores data in localStorage.</p></div></div>
        <div class="button-row"><button class="button secondary" type="button" data-action="export-data">Export household JSON</button><button class="button danger" type="button" data-action="reset-data">Reset local data</button></div>
      </section>`;
  }

  function profileCard(person) {
    return `<article class="profile-card" data-person-id="${h(person.id)}"><div class="profile-title"><h3>${h(person.name)}</h3>${state.people.length > 1 ? `<button class="icon-button" type="button" data-action="delete-person" data-person-id="${h(person.id)}" aria-label="Remove ${h(person.name)}">×</button>` : ''}</div><div class="profile-fields"><label>Name<input value="${h(person.name)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="name" /></label><label>Energy target<input type="number" value="${h(person.targetKcal)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="targetKcal" /></label><label>Portion multiplier<input type="number" min="0.25" step="0.05" value="${h(person.portion)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="portion" /></label><label>Protein target (g)<input type="number" value="${h(person.proteinTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="proteinTarget" /></label><label>Fibre target (g)<input type="number" value="${h(person.fibreTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="fibreTarget" /></label><label>Iron target (mg)<input type="number" value="${h(person.ironTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="ironTarget" /></label></div></article>`;
  }

  function implementationItem(label, status) {
    return `<div class="implementation-item"><span>${h(label)}</span><strong>${h(status)}</strong></div>`;
  }

  function renderAll() {
    renderNav();
    renderToday();
    renderPlan();
    renderNutrition();
    renderPantry();
    renderShop();
    renderMore();
    document.querySelectorAll('.app-view').forEach((view) => { view.hidden = view.dataset.view !== activeView; });
  }

  function navigate(view) {
    activeView = view;
    renderAll();
    document.getElementById(`view-${view}`)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function findEntry(id) {
    return state.plan.find((entry) => entry.id === id);
  }

  function swapMeal(id) {
    const entry = findEntry(id);
    if (!entry) return;
    const ranked = rankedRecipes(entry.slot, [entry.recipeId]);
    const currentIndex = ranked.findIndex((item) => item.recipe.id === entry.recipeId);
    const next = ranked[(currentIndex + 1 + ranked.length) % ranked.length] || ranked.find((item) => item.recipe.id !== entry.recipeId);
    if (!next) return showToast('No compatible alternative is available.');
    entry.recipeId = next.recipe.id;
    entry.reason = reasonFor(next.recipe);
    entry.pinned = false;
    audit('meal_swapped', `${entry.day} ${entry.slot} changed to ${next.recipe.name}`);
    saveState('Meal swapped');
    renderAll();
  }

  function adjustServing(id, delta) {
    const entry = findEntry(id);
    if (!entry) return;
    const people = state.people;
    const perPersonDelta = Number(delta) / Math.max(people.length, 1);
    for (const person of people) entry.people[person.id] = Math.max(0, engine.round(Number(entry.people[person.id] || 0) + perPersonDelta, 2));
    entry.cookServings = engine.round(Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0), 2);
    saveState('Portions updated');
    renderAll();
  }

  function addPantry(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    const mode = String(data.get('mode'));
    const quantityRaw = Number(data.get('quantity'));
    state.pantry.push({
      id: uid('pantry'), foodId: null, name, mode,
      quantity: mode === 'status' || !Number.isFinite(quantityRaw) ? null : quantityRaw,
      unit: String(data.get('unit')), status: String(data.get('status')), storage: 'Cupboard', useSoon: null,
    });
    audit('pantry_item_added', name);
    saveState('Pantry item added');
    form.reset();
    renderAll();
  }

  function addManualShopping(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    state.shopping.manualItems.push({ id: uid('manual'), name, value: Number(data.get('value')) || 1, unit: String(data.get('unit')), category: String(data.get('category') || 'Household & manual') });
    audit('shopping_manual_added', name);
    saveState('Shopping item added');
    form.reset();
    renderAll();
  }

  function sharePayload(type) {
    if (type === 'pantry') return { type: 'pantry', version: 1, items: state.pantry.map(({ id, foodId, name, mode, quantity, unit, status, storage, useSoon }) => ({ id, foodId, name, mode, quantity, unit, status, storage, useSoon })) };
    return { type: 'shopping', version: 1, items: shoppingRows().map((item) => ({ name: item.name, quantity: item.displayValue, unit: item.displayUnit, checked: item.checked, state: item.state })) };
  }

  async function shareData(type) {
    const payload = sharePayload(type);
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = `${location.origin}${location.pathname}#share=${encoded}`;
    const title = type === 'pantry' ? `${state.householdName} pantry` : `${state.householdName} shopping list`;
    try {
      if (navigator.share) await navigator.share({ title, text: title, url });
      else await navigator.clipboard.writeText(url);
      showToast(navigator.share ? 'Share sheet opened.' : 'Share link copied.');
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Sharing was not available.');
    }
  }

  function importSharedData() {
    if (!location.hash.startsWith('#share=')) return;
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(7)))));
      if (payload.type === 'pantry' && Array.isArray(payload.items)) {
        state.pantry = payload.items.map((item) => ({ ...item, id: uid('pantry') }));
        audit('pantry_imported', `${payload.items.length} items imported from a shared link`);
        saveState('Shared pantry imported');
        history.replaceState(null, '', location.pathname);
        showToast('Shared pantry imported into this browser.');
      }
    } catch {
      showToast('The shared link could not be read.');
    }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function confirmAction(title, body, confirmLabel = 'Confirm') {
    const dialog = document.getElementById('confirmDialog');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').textContent = body;
    document.getElementById('dialogConfirm').textContent = confirmLabel;
    dialog.showModal();
    return new Promise((resolve) => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
  }

  async function completeShopping() {
    const checkedRows = shoppingRows().filter((item) => item.checked);
    if (!checkedRows.length) return showToast('No checked items to complete.');
    const confirmed = await confirmAction('Complete checked items?', 'Checked generated items will remain recorded as completed. Manual checked items will be removed from the active list.', 'Complete');
    if (!confirmed) return;
    const manualIds = new Set(checkedRows.filter((item) => item.manual).map((item) => item.id));
    state.shopping.manualItems = state.shopping.manualItems.filter((item) => !manualIds.has(item.id));
    audit('shopping_completed', `${checkedRows.length} checked items completed`);
    saveState('Shopping updated');
    renderAll();
    showToast('Checked items completed. Pantry purchase reconciliation is reserved for the backend phase.');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meal-planner-${state.weekStart}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function updateOnlineState() {
    document.getElementById('offlineBanner').hidden = navigator.onLine;
  }

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'navigate') return navigate(target.dataset.view);
    if (action === 'generate-plan') {
      state.preferences.mode = document.getElementById('planningMode').value;
      state.preferences.diet = document.getElementById('dietMode').value;
      state.preferences.focus = document.getElementById('nutrientFocus').value;
      state.preferences.focusStrength = document.getElementById('focusStrength').value;
      return generatePlan({ preservePinned: true });
    }
    if (action === 'select-day') {
      state.selectedPlanDay = Number(target.dataset.dayIndex);
      saveState();
      renderAll();
      document.getElementById(`plan-day-${state.selectedPlanDay}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      return;
    }
    if (action === 'toggle-pin') {
      const entry = findEntry(target.dataset.entryId);
      if (entry) entry.pinned = !entry.pinned;
      saveState('Pin updated');
      return renderAll();
    }
    if (action === 'swap-meal') return swapMeal(target.dataset.entryId);
    if (action === 'adjust-serving') return adjustServing(target.dataset.entryId, Number(target.dataset.delta));
    if (action === 'toggle-skip') {
      const entry = findEntry(target.dataset.entryId);
      if (entry) entry.skipped = !entry.skipped;
      saveState('Meal status updated');
      return renderAll();
    }
    if (action === 'select-nutrition-person') { activeNutritionPerson = target.dataset.personId; return renderAll(); }
    if (action === 'delete-pantry') {
      const item = state.pantry.find((row) => row.id === target.dataset.pantryId);
      const confirmed = await confirmAction('Remove pantry item?', `Remove ${item?.name || 'this item'} from the pantry?`, 'Remove');
      if (!confirmed) return;
      state.pantry = state.pantry.filter((row) => row.id !== target.dataset.pantryId);
      saveState('Pantry item removed');
      return renderAll();
    }
    if (action === 'share-pantry') return shareData('pantry');
    if (action === 'share-shopping') return shareData('shopping');
    if (action === 'print') return window.print();
    if (action === 'remove-shopping') {
      const id = target.dataset.itemId;
      if (target.dataset.manual === 'true') state.shopping.manualItems = state.shopping.manualItems.filter((item) => item.id !== id);
      else state.shopping.suppressed = [...new Set([...state.shopping.suppressed, id])];
      state.shopping.checked = state.shopping.checked.filter((itemId) => itemId !== id);
      saveState('Shopping item removed');
      return renderAll();
    }
    if (action === 'complete-shopping') return completeShopping();
    if (action === 'add-person') {
      const id = uid('person');
      state.people.push({ id, name: `Person ${state.people.length + 1}`, targetKcal: 2000, proteinTarget: 80, fibreTarget: 28, ironTarget: 11, calciumTarget: 950, vitaminCTarget: 95, portion: 1 });
      activeNutritionPerson = id;
      saveState('Person added');
      return generatePlan({ preservePinned: true });
    }
    if (action === 'delete-person') {
      const person = state.people.find((item) => item.id === target.dataset.personId);
      const confirmed = await confirmAction('Remove person profile?', `Remove ${person?.name || 'this profile'} from planning?`, 'Remove');
      if (!confirmed) return;
      state.people = state.people.filter((item) => item.id !== target.dataset.personId);
      state.plan.forEach((entry) => { delete entry.people[target.dataset.personId]; entry.cookServings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0); });
      activeNutritionPerson = state.people[0].id;
      saveState('Person removed');
      return renderAll();
    }
    if (action === 'export-data') return exportData();
    if (action === 'reset-data') {
      const confirmed = await confirmAction('Reset local meal planner?', 'This removes the local plan, pantry, profiles and shopping edits from this browser.', 'Reset');
      if (!confirmed) return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      generatePlan({ preservePinned: false });
      return;
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    const action = target.dataset.action;
    if (action === 'update-use-soon') {
      const item = state.pantry.find((row) => row.id === target.dataset.pantryId);
      if (item) item.useSoon = target.value || null;
      saveState('Pantry date updated');
      return;
    }
    if (action === 'toggle-shopping') {
      const id = target.dataset.itemId;
      state.shopping.checked = target.checked ? [...new Set([...state.shopping.checked, id])] : state.shopping.checked.filter((itemId) => itemId !== id);
      saveState('Shopping item updated');
      return renderAll();
    }
    if (action === 'edit-shopping-quantity' || action === 'edit-shopping-unit') {
      const id = target.dataset.itemId;
      const row = shoppingRows().find((item) => item.id === id);
      if (!row) return;
      const container = target.closest('.quantity-editor');
      const value = Number(container.querySelector('input').value) || 0;
      const unit = container.querySelector('select').value;
      if (target.dataset.manual === 'true') {
        const manual = state.shopping.manualItems.find((item) => item.id === id);
        if (manual) { manual.value = value; manual.unit = unit; }
      } else state.shopping.overrides[id] = { value, unit };
      saveState('Shopping quantity updated');
      return renderAll();
    }
    if (action === 'change-shopping-state') {
      state.shopping.states[target.dataset.itemId] = target.value;
      saveState('Shopping state updated');
      return renderAll();
    }
    if (action === 'edit-person') {
      const person = state.people.find((item) => item.id === target.dataset.personId);
      if (!person) return;
      const field = target.dataset.field;
      person[field] = field === 'name' ? target.value.trim() || person.name : Number(target.value);
      if (field === 'portion') state.plan.forEach((entry) => { entry.people[person.id] = person.portion; entry.cookServings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0); });
      saveState('Profile updated');
      return renderAll();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'shoppingSearch') {
      state.shopping.search = event.target.value;
      saveState();
    }
  });

  document.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'pantryForm') addPantry(event.target);
    if (event.target.id === 'manualShoppingForm') addManualShopping(event.target);
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'shoppingSearch') {
      state.shopping.search = event.target.value;
      saveState();
      renderShop();
      return;
    }
    if (event.target.id === 'shoppingFilter') {
      state.shopping.filter = event.target.value;
      saveState();
      renderShop();
    }
  });

  document.getElementById('shareHouseholdBtn').addEventListener('click', () => shareData('pantry'));
  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});

  importSharedData();
  ensurePlan();
  updateOnlineState();
  renderAll();
})();
