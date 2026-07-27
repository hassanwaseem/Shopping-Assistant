const test = require('node:test');
const assert = require('node:assert/strict');
require('../data/recipe-profiles-1.js');
require('../data/recipe-profiles-2.js');
const recipes = require('../data/recipes.js');

test('catalog has 500 complete unique recipes', () => {
  assert.equal(recipes.length, 500);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, 500);
  for (const recipe of recipes) {
    assert.ok(recipe.ingredients.length >= 6, recipe.id);
    assert.ok(recipe.instructions.length >= 5, recipe.id);
    assert.ok(recipe.cuisine);
    assert.ok(recipe.mealType);
    assert.ok(recipe.nutrition.kcal > 0);
  }
});

test('catalog is broadly even with a larger Pakistani allocation', () => {
  const counts = recipes.reduce((map, recipe) => map.set(recipe.cuisine, (map.get(recipe.cuisine) || 0) + 1), new Map());
  assert.equal(counts.size, 40);
  assert.equal(counts.get('Pakistani'), 16);
  for (const [cuisine, count] of counts) {
    if (cuisine !== 'Pakistani') assert.ok(count === 12 || count === 13, `${cuisine}: ${count}`);
  }
});

test('catalog contains traditional and inspired recipes', () => {
  const traditional = recipes.filter((recipe) => recipe.authenticity === 'traditional').length;
  const inspired = recipes.filter((recipe) => recipe.authenticity === 'inspired').length;
  assert.ok(traditional >= 100);
  assert.ok(inspired >= 300);
});

test('catalog excludes prohibited ingredient vocabulary', () => {
  const text = JSON.stringify(recipes).toLowerCase();
  for (const word of ['pork', 'bacon', 'ham', 'wine', 'beer', 'rum', 'brandy', 'sake', 'mirin', 'gelatin']) {
    assert.equal(text.includes(word), false, word);
  }
});
