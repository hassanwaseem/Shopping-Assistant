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

test('missing nutrients are omitted rather than converted to zero', () => {
  const totals = engine.sumNutrition([{ recipeId: 'stew', people: { a: 1 } }], recipes, 'a');
  assert.equal(totals.iron, 4);
  assert.equal(Object.hasOwn(totals, 'calcium'), false);
});
