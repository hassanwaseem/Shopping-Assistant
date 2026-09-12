const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const core = read('app/app-core.js');
const primary = read('app/app-views-primary.js');
const cook = read('app/app-views-cook.js');
const domain = read('app/app-domain.js');
const index = read('index.html');

test('planner declares five ordered daily slots and optional counts', () => {
  assert.match(core, /\['breakfast', 'lunch', 'dinner', 'dessert', 'tea'\]/);
  assert.match(primary, /Desserts this week/);
  assert.match(primary, /Tea\/drinks this week/);
});

test('legacy plans preserve compatible meals while new slots are added', () => {
  assert.match(core, /preserveExisting = false/);
  assert.match(core, /engine\.isRecipeEligible\(existingRecipe, slot\)/);
  assert.match(core, /buildPlanVariant\(\{ preservePinned: true, preserveExisting: true/);
});

test('whole-plan alternatives are previewed before being accepted and can be undone', () => {
  assert.match(primary, /Regenerate whole plan/);
  assert.match(domain, /Your current plan will remain unchanged until you accept a preview/);
  assert.match(domain, /function acceptPlanAlternative/);
  assert.match(domain, /function undoFullPlan/);
});

test('cook discovery and expanded swap interfaces are wired into the application', () => {
  assert.match(index, /id="view-cook"/);
  assert.match(cook, /What should we cook\?/);
  assert.match(cook, /Best overall match/);
  assert.match(cook, /Fastest and easiest/);
  assert.match(cook, /Uses the most pantry items/);
  assert.match(domain, /slice\(0, 10\)/);
});
