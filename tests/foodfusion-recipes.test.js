const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const datasetPath = path.join(__dirname, '..', 'data', 'foodfusion-recipes.json');
const reportPath = path.join(__dirname, '..', 'data', 'foodfusion-import-report.json');

test('generated Food Fusion dataset accounts for every requested source record', () => {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const recipes = dataset.dish_families.flatMap((family) => family.variants || []);
  assert.equal(recipes.length, dataset.variant_model.recipe_variant_count);
  assert.equal(recipes.length, report.parsed_count);
  assert.equal(recipes.length + report.failure_count, report.records_requested);
  assert.equal(dataset.validation.result, 'passed');
});

test('generated recipe objects are complete, link-free, and independently concise', () => {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const recipes = dataset.dish_families.flatMap((family) => family.variants || []);
  const ids = new Set();
  for (const recipe of recipes) {
    assert.ok(recipe.id && !ids.has(recipe.id));
    ids.add(recipe.id);
    assert.ok(recipe.name);
    assert.ok(recipe.ingredients.length > 0);
    assert.ok(recipe.instructions.length > 0);
    assert.ok(recipe.instructions.join(' ').split(/\s+/).length <= 195);
    assert.doesNotMatch(JSON.stringify(recipe), /https?:\/\//i);
    assert.doesNotMatch(recipe.instructions.join(' '), /\.\.|Carry out this step:|\b(?:ingredients?|directions?)\s*:/i);
    assert.ok(recipe.import_metadata.instruction_fourgram_overlap <= 0.72);
  }
});
