const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../planner-engine.js');

const recipes = {
  stew: {
    id: 'stew',
    name: 'Stew',
    servings: 2,
    nutrition: { kcal: 400, protein: 20, iron: 4 },
    ingredients: [
      { id: 'lentils', foodId: 'lentils', name: 'Lentils', quantity: 200, unit: 'g', category: 'Dry goods' },
      { id: 'water', foodId: 'water', name: 'Water', quantity: 500, unit: 'ml', category: 'Other' },
    ],
  },
};

test('normalizes mass and volume without mixing dimensions', () => {
  assert.deepEqual(engine.normalizeQuantity(1.5, 'kg'), { value: 1500, unit: 'g', confidence: 'exact' });
  assert.deepEqual(engine.normalizeQuantity(2, 'l'), { value: 2000, unit: 'ml', confidence: 'exact' });
});

test('aggregates scaled recipe requirements', () => {
  const result = engine.aggregateIngredients([{ id: 'e1', recipeId: 'stew', cookServings: 4, day: 'Mon', slot: 'Dinner' }], recipes);
  assert.equal(result.find((x) => x.foodId === 'lentils').gross, 400);
  assert.equal(result.find((x) => x.foodId === 'water').gross, 1000);
});

test('only explicitly selected plan entries contribute ingredients', () => {
  const plan = [
    { id: 'monday-stew', recipeId: 'stew', cookServings: 2, day: 'Mon', slot: 'Dinner' },
    { id: 'tuesday-stew', recipeId: 'stew', cookServings: 4, day: 'Tue', slot: 'Dinner' },
  ];
  assert.deepEqual(engine.filterSelectedPlanEntries(plan, []), []);
  const selected = engine.filterSelectedPlanEntries(plan, ['tuesday-stew']);
  assert.deepEqual(selected.map((entry) => entry.id), ['tuesday-stew']);
  assert.equal(engine.aggregateIngredients(selected, recipes).find((item) => item.foodId === 'lentils').gross, 400);
});

test('pantry subtraction never creates a negative shopping quantity', () => {
  const aggregate = [{ key: 'lentils::g', foodId: 'lentils', name: 'Lentils', category: 'Dry goods', gross: 400, unit: 'g', sourceMeals: [] }];
  const result = engine.subtractPantry(aggregate, [{ id: 'p1', foodId: 'lentils', name: 'Lentils', mode: 'exact', quantity: 1000, unit: 'g' }]);
  assert.equal(result[0].net, 0);
  assert.equal(result[0].pantryApplied, 400);
});

test('unknown pantry states are flagged instead of precisely subtracted', () => {
  const aggregate = [{ key: 'lentils::g', foodId: 'lentils', name: 'Lentils', category: 'Dry goods', gross: 400, unit: 'g', sourceMeals: [] }];
  const result = engine.subtractPantry(aggregate, [{ id: 'p1', foodId: 'lentils', name: 'Lentils', mode: 'status', status: 'low' }]);
  assert.equal(result[0].net, 400);
  assert.equal(result[0].checkPantry, true);
});

test('pantry coverage uses unique ingredients and reports insufficient quantities', () => {
  const recipe = {
    ingredients: [
      { foodId: 'onions', name: 'Onions', quantity: 3, unit: 'count' },
      { foodId: 'onions', name: 'Onions', quantity: 1, unit: 'count' },
      { foodId: 'chicken', name: 'Chicken', quantity: 500, unit: 'g' },
      { foodId: 'water', name: 'Water', quantity: 500, unit: 'ml' },
    ],
  };
  const coverage = engine.pantryCoverage(recipe, [
    { foodId: 'onions', name: 'Onions', mode: 'count', quantity: 2, unit: 'count', status: 'low' },
  ]);
  assert.equal(coverage.total, 2);
  assert.equal(coverage.percent, 50);
  assert.deepEqual(coverage.partial, ['Onions']);
  assert.deepEqual(coverage.unrecorded, ['Chicken']);
  assert.equal(coverage.missing, 2);
});

test('missing nutrients are omitted rather than converted to zero', () => {
  const totals = engine.sumNutrition([{ recipeId: 'stew', people: { a: 1 } }], recipes, 'a');
  assert.equal(totals.iron, 4);
  assert.equal(Object.hasOwn(totals, 'calcium'), false);
});

test('nutrition completeness ignores skipped optional slots', () => {
  const map = {
    complete: { completeness: 100 },
    partial: { completeness: 60 },
  };
  const result = engine.completeness([
    { recipeId: 'complete', skipped: false },
    { recipeId: 'partial', skipped: true },
  ], map);
  assert.equal(result.score, 100);
  assert.equal(result.missing, 0);
});

test('enforces course suitability for dinner, dessert, and tea', () => {
  const dinner = { mealSlots: ['dinner'], eligibleMealSlots: ['dinner'], courseType: 'main', isCompleteMeal: true, canBeStandalone: true };
  const iceCream = { mealSlots: ['dessert'], eligibleMealSlots: ['dessert'], courseType: 'dessert', isCompleteMeal: false, canBeStandalone: true };
  const chai = { mealSlots: ['tea'], eligibleMealSlots: ['tea'], courseType: 'drink', isCompleteMeal: false, canBeStandalone: true };
  const side = { mealSlots: ['dinner'], eligibleMealSlots: ['dinner'], courseType: 'side', isCompleteMeal: false, canBeStandalone: false };

  assert.equal(engine.isRecipeEligible(dinner, 'dinner'), true);
  assert.equal(engine.isRecipeEligible(iceCream, 'dinner'), false);
  assert.equal(engine.isRecipeEligible(iceCream, 'dessert'), true);
  assert.equal(engine.isRecipeEligible(chai, 'tea'), true);
  assert.equal(engine.isRecipeEligible(chai, 'dinner'), false);
  assert.equal(engine.isRecipeEligible(side, 'dinner'), false);
});

test('automatic recommendations reject review-required and extreme-energy records', () => {
  const dinner = { mealSlots: ['dinner'], courseType: 'main', isCompleteMeal: true, canBeStandalone: true, recommendationEligible: true, nutrition: { kcal: 600 } };
  assert.equal(engine.isRecipeRecommendable(dinner, 'dinner'), true);
  assert.equal(engine.isRecipeRecommendable({ ...dinner, recommendationEligible: false }, 'dinner'), false);
  assert.equal(engine.isRecipeRecommendable({ ...dinner, nutrition: { kcal: 1500 } }, 'dinner'), false);
});
