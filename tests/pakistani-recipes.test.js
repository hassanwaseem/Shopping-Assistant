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
  assert.equal(recipes.length, 501);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, 501);
  assert.ok(recipes.every((recipe) => ['Pakistani', 'Afghan'].includes(recipe.cuisine)));
  assert.ok(recipes.some((recipe) => recipe.cuisine === 'Afghan'));
  assert.ok(recipes.some((recipe) => /aloo paratha/i.test(recipe.name)));
  assert.equal(recipes.find((recipe) => recipe.name === 'Chapli Kabab Recipe').cuisine, 'Pakistani');
  assert.ok(recipes.some((recipe) => recipe.name === 'Kashmiri Chai'));
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
