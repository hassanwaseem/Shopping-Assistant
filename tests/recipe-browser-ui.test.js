const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const recipeViewSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'app-views-recipes.js'),
  'utf8',
);
const appMainSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'app-main.js'),
  'utf8',
);

test('recipe catalogue does not expose the collection total in user-facing copy', () => {
  assert.doesNotMatch(recipeViewSource, /\$\{RECIPES\.length\}/);
  assert.doesNotMatch(recipeViewSource, /\$\{filtered\.length\}\s+matching recipes/);
  assert.match(recipeViewSource, /Browse complete recipes/);
});

test('recipe search refreshes results without replacing the focused input', () => {
  assert.match(recipeViewSource, /function renderRecipeResults\(\)/);
  assert.match(
    appMainSource,
    /if \(event\.target\.id === 'recipeSearch'\)[\s\S]*?renderRecipeResults\(\);[\s\S]*?return;/,
  );
  assert.doesNotMatch(
    appMainSource,
    /if \(event\.target\.id === 'recipeSearch'\)[\s\S]*?renderRecipes\(\);[\s\S]*?return;/,
  );
});
