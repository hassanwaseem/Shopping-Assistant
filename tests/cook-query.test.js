const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCookQuery } = require('../app/app-views-cook.js');

test('parses positive ingredients, time and meal intent', () => {
  const parsed = parseCookQuery('Something with chicken and rice under 30 minutes for dinner');
  assert.equal(parsed.mealSlot, 'dinner');
  assert.equal(parsed.maxTime, 30);
  assert.deepEqual(parsed.includeTerms, ['chicken', 'rice']);
});

test('treats without ingredients as exclusions rather than required words', () => {
  const parsed = parseCookQuery('Chicken without nuts');
  assert.deepEqual(parsed.includeTerms, ['chicken']);
  assert.deepEqual(parsed.excludeTerms, ['nuts']);
});

test('captures warm drink intent', () => {
  const parsed = parseCookQuery('A warm drink for after dinner');
  assert.equal(parsed.mealSlot, 'tea');
  assert.equal(parsed.temperature, 'warm');
  assert.deepEqual(parsed.includeTerms, []);
});
