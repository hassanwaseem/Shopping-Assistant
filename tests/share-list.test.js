const test = require('node:test');
const assert = require('node:assert/strict');
const { formatSharedQuantity, filterShareRows, buildShoppingShareTextFromRows } = require('../app/app-domain.js');

test('formats practical needed amounts for sharing', () => {
  assert.equal(formatSharedQuantity(1230, 'g'), '1.23 kg');
  assert.equal(formatSharedQuantity(1000, 'ml'), '1 l');
  assert.equal(formatSharedQuantity(1, 'count'), '1 item');
  assert.equal(formatSharedQuantity(6, 'count'), '6 items');
});

test('shares only remaining needed items', () => {
  const rows = [
    { name: 'Tomatoes', category: 'Produce', displayValue: 1230, displayUnit: 'g', checked: false, state: 'needed' },
    { name: 'Eggs', category: 'Dairy & alternatives', displayValue: 6, displayUnit: 'count', checked: false, state: 'unavailable' },
    { name: 'Spinach', category: 'Produce', displayValue: 300, displayUnit: 'g', checked: false, state: 'needed', checkPantry: true },
    { name: 'Rice', category: 'Dry goods', displayValue: 500, displayUnit: 'g', checked: false, state: 'skipped' },
    { name: 'Milk', category: 'Dairy & alternatives', displayValue: 1, displayUnit: 'l', checked: false, state: 'already-have' },
    { name: 'Soap', category: 'Household', displayValue: 1, displayUnit: 'count', checked: true, state: 'needed' },
  ];

  assert.deepEqual(filterShareRows(rows).map((item) => item.name), ['Eggs', 'Spinach', 'Tomatoes']);
  const text = buildShoppingShareTextFromRows(rows, 'Our kitchen');
  assert.match(text, /^Our kitchen shopping list\n3 items needed/);
  assert.match(text, /• Eggs — 6 items \(unavailable\)/);
  assert.match(text, /• Spinach — 300 g \(check pantry\)/);
  assert.match(text, /• Tomatoes — 1\.23 kg/);
  assert.doesNotMatch(text, /Rice|Milk|Soap/);
});

test('shares an explicit empty-state message', () => {
  const text = buildShoppingShareTextFromRows([], 'Our kitchen');
  assert.equal(text, 'Our kitchen shopping list\n\nNothing is currently needed.');
});
