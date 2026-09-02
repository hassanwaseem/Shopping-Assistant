const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const estimator = require('../scripts/estimate-foodfusion-nutrition.cjs');

const dataPath = (name) => path.join(__dirname, '..', 'data', name);
const load = (name) => JSON.parse(fs.readFileSync(dataPath(name), 'utf8'));
const recipesIn = (dataset) => dataset.dish_families.flatMap((family) => family.variants || []);
const nutrientKeys = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'iron_mg', 'calcium_mg', 'vitamin_c_mg', 'sodium_mg'];

test('provides labelled ingredient-based estimates for every standalone Food Fusion recipe', () => {
  const recipes = recipesIn(load('foodfusion-recipes.json'));
  assert.equal(recipes.length, 3615);
  for (const recipe of recipes) {
    const nutrition = recipe.nutrition_per_serving;
    assert.equal(nutrition.basis, 'ingredient_based_estimate_usda_sr_legacy');
    assert.ok(['low', 'low-moderate', 'moderate'].includes(nutrition.confidence));
    assert.ok(nutrition.ingredient_weight_coverage >= 0 && nutrition.ingredient_weight_coverage <= 1);
    assert.ok(nutrition.ingredient_item_coverage >= 0 && nutrition.ingredient_item_coverage <= 1);
    for (const key of nutrientKeys) assert.ok(Number.isFinite(nutrition[key]) && nutrition[key] >= 0, `${recipe.id}: ${key}`);
  }
});

test('copies estimates to every Food Fusion primary variant in the merged dataset', () => {
  const standalone = recipesIn(load('foodfusion-recipes.json'));
  const merged = recipesIn(load('pakistani-recipes.json'));
  const estimates = new Map(standalone.map((recipe) => [Number(recipe.import_metadata.source_record_id), recipe]));
  const primary = merged.filter((recipe) => recipe.id.startsWith('foodfusion-'));
  assert.equal(primary.length, 3549);
  for (const recipe of primary) {
    const original = estimates.get(Number(recipe.import_metadata.source_record_id));
    assert.ok(original, recipe.id);
    assert.deepEqual(recipe.nutrition_per_serving, original.nutrition_per_serving);
    assert.equal(recipe.servings, original.servings);
  }
});

test('nutrition audit accounts for all estimates and records useful coverage', () => {
  const report = load('foodfusion-nutrition-estimate-report.json');
  assert.equal(report.standalone_recipes_estimated, 3615);
  assert.equal(report.merged_primary_recipes_updated, 3549);
  assert.equal(Object.values(report.confidence_counts).reduce((sum, count) => sum + count, 0), 3615);
  assert.ok(report.average_ingredient_weight_coverage >= 0.9);
  assert.ok(report.calorie_distribution_per_serving.median.kcal > 100);
});

test('section labels do not contaminate ingredient matching', () => {
  const profiles = load('usda-sr-legacy-nutrition-reference.json').profiles;
  const recipe = { name: 'Matka Beef Biryani' };
  const clove = { item: 'Cloves', amount: 2, unit: 'count', preparation: 'for Beef Qorma' };
  const tomato = { item: 'Tomatoes', amount: 2, unit: 'count', preparation: 'for Beef Qorma' };
  assert.equal(estimator.profileFor(clove, recipe, profiles).key, 'cumin');
  assert.equal(estimator.profileFor(tomato, recipe, profiles).key, 'tomato');
  assert.equal(estimator.gramsFor(clove, estimator.profileFor(clove, recipe, profiles), 4).grams, 0.6);
});
