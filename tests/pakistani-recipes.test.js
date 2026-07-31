const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const adapter = require('../data/pakistani-recipes-adapter.js');

const source = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'pakistani-recipes.json'), 'utf8'),
);
const recipes = adapter.adaptDataset(source);

test('loads the complete validated Pakistani collection', () => {
  assert.equal(recipes.length, source.variant_model.recipe_variant_count);
  assert.equal(recipes.length, 698);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, recipes.length);
  assert.ok(recipes.every((recipe) => ['Pakistani', 'Afghan'].includes(recipe.cuisine)));
  assert.ok(recipes.some((recipe) => recipe.cuisine === 'Afghan'));
  assert.ok(recipes.some((recipe) => /aloo paratha/i.test(recipe.name)));
  assert.equal(recipes.find((recipe) => recipe.name === 'Chapli Kabab Recipe').cuisine, 'Pakistani');
  assert.ok(recipes.some((recipe) => recipe.name === 'Kashmiri Chai'));
});

test('includes Pakistani-home-style pasta and desserts with planner-ready metadata', () => {
  for (const name of [
    'Chicken White Sauce Pasta',
    'Pakistani Keema Macaroni',
    'Chicken Lasagna',
    'Classic Chocolate Chip Cookies',
    'Fudgy Chocolate Brownies',
    'Banana Walnut Muffins',
    'Classic Banana Bread',
    'Pakistani Fruit Custard Trifle',
    'Coffee Biscuit Pudding',
    'Alcohol-Free Tiramisu',
  ]) {
    assert.ok(recipes.some((recipe) => recipe.name === name), `${name} is missing`);
  }

  const pasta = recipes.find((recipe) => recipe.name === 'Chicken White Sauce Pasta');
  assert.equal(pasta.dishType, 'Pasta, macaroni & lasagna');
  assert.deepEqual(pasta.mealSlots, ['lunch', 'dinner']);
  assert.equal(pasta.authenticity, 'fusion');

  const tiramisu = recipes.find((recipe) => recipe.name === 'Alcohol-Free Tiramisu');
  assert.equal(tiramisu.dishType, 'Desserts');
  assert.match(tiramisu.instructions.join(' '), /chill/i);
  assert.doesNotMatch(tiramisu.ingredients.map((item) => item.displayText).join(' '), /\b(rum|marsala|liqueur|brandy)\b/i);
});

test('retains Flour & Spice overlaps as merged sources or alternate methods', () => {
  const flourSources = recipes.flatMap((recipe) => recipe.sources
    .filter((sourceEntry) => (
      sourceEntry.source_name === 'Flour & Spice'
      && sourceEntry.url.startsWith('https://www.flourandspiceblog.com/')
    ))
    .map((sourceEntry) => ({ recipe, url: sourceEntry.url })));

  assert.equal(flourSources.length, 209);
  assert.equal(new Set(flourSources.map((entry) => entry.url)).size, 209);
  assert.ok(flourSources.some(({ recipe }) => recipe.alternateMethods.length > 0));
  assert.deepEqual(source.source_inventory['Flour & Spice'], {
    recipe_index_url: 'https://www.flourandspiceblog.com/recipe-index/',
    sitemap_posts_found: 231,
    recipe_cards_extracted: 212,
    non_recipe_or_failed_pages: source.source_inventory['Flour & Spice'].non_recipe_or_failed_pages,
  });
});

test('normalizes every recipe into the planner model', () => {
  for (const recipe of recipes) {
    assert.ok(recipe.name);
    assert.ok(adapter.DISH_TYPES.includes(recipe.dishType));
    assert.ok(adapter.MAIN_INGREDIENTS.includes(recipe.mainIngredient));
    assert.ok(recipe.servings > 0);
    assert.ok(recipe.totalTime > 0);
    assert.ok(recipe.instructions.length > 0);
    assert.ok(recipe.ingredients.length > 0);
    assert.ok(recipe.ingredients.every((item) => Number.isFinite(item.quantity) && item.quantity >= 0));
    assert.ok(Number.isFinite(recipe.nutrition.kcal));
  }
});

test('provides enough eligible recipes for every planned meal slot', () => {
  for (const slot of ['breakfast', 'lunch', 'dinner']) {
    const candidates = recipes.filter((recipe) => recipe.mealSlots.includes(slot));
    assert.ok(candidates.length >= 10, `${slot} has only ${candidates.length} candidates`);
  }
});

test('recalculates dietary tags instead of trusting incorrect source tags', () => {
  const meatRecipe = recipes.find((recipe) => recipe.name === 'Punjabi Achar Gosht');
  assert.ok(meatRecipe);
  assert.equal(meatRecipe.diets.includes('vegetarian'), false);
  assert.equal(meatRecipe.diets.includes('vegan'), false);

  const veganRecipe = recipes.find((recipe) => recipe.diets.includes('vegan'));
  assert.ok(veganRecipe);
  assert.equal(veganRecipe.diets.includes('vegetarian'), true);
});

test('uses Pakistani-focused filters without exposing unrelated cuisine labels', () => {
  assert.ok(recipes.some((recipe) => recipe.region === 'Punjab'));
  assert.ok(recipes.some((recipe) => recipe.region === 'Sindh'));
  assert.ok(recipes.some((recipe) => recipe.region === 'Khyber Pakhtunkhwa'));
  assert.equal(recipes.some((recipe) => ['Indian', 'Parsi Cuisine', 'South Asian Cuisine'].includes(recipe.cuisine)), false);
});
