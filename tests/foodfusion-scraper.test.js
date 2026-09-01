const test = require('node:test');
const assert = require('node:assert/strict');

const scraper = require('../scripts/scrape-foodfusion.cjs');

const SAMPLE_HTML = `
  <div id="recipe-step-direction-detail">
    <div class="english-detail-ff">
      <p>Ingredients:<br>
      <strong><u>Prepare Sauce:</u></strong></p>
      <p>-Dahi (Yogurt) chilled 1 &amp; ½ Cup</p>
      <p>-Lehsan (Garlic) 3 cloves</p>
      <p>-Salt ½ tsp or to taste</p>
      <p>Direction:</p>
      <p><strong><u>Prepare Sauce:</u></strong></p>
      <p>-In a blending jar, add yogurt, garlic and salt, blend well and set aside.</p>
      <p>-Cover &amp; cook on low flame for 10-12 minutes.</p>
    </div>
    <div class="urdu-detail-ff"><p>Ingredients:</p></div>
  </div>`;

test('parses Unicode fractions and ranges', () => {
  assert.equal(scraper.parseNumber('1 1/2'), 1.5);
  assert.equal(scraper.parseNumber('3-5'), 4);
  assert.equal(scraper.normalizeFractions('1 & ½'), '1 1/2');
});

test('extracts only the English recipe block', () => {
  const block = scraper.extractEnglishBlock(SAMPLE_HTML);
  assert.match(block, /Yogurt/);
  assert.doesNotMatch(block, /urdu-detail-ff/);
});

test('parses structured ingredient facts', () => {
  const sections = scraper.parseRecipeSections(SAMPLE_HTML);
  const ingredients = scraper.parseIngredients(sections.ingredientLines);
  assert.equal(ingredients.length, 3);
  assert.deepEqual(ingredients[0], {
    item: 'Yogurt',
    amount: 1.5,
    unit: 'cup',
    preparation: 'for Sauce',
    text: 'Dahi (Yogurt) chilled 1 & ½ Cup',
  });
  assert.equal(ingredients[1].item, 'Garlic');
  assert.equal(ingredients[1].amount, 3);
  assert.equal(ingredients[1].unit, 'clove');
});

test('creates independent concise directions', () => {
  const sections = scraper.parseRecipeSections(SAMPLE_HTML);
  const source = sections.directionLines.filter((line) => !line.startsWith('##')).join(' ');
  const instructions = scraper.compactInstructions(sections.directionLines);
  assert.ok(instructions.length >= 2);
  assert.notEqual(instructions.join(' '), source);
  assert.ok(instructions.join(' ').split(/\s+/).length <= scraper.MAX_INSTRUCTION_WORDS);
  assert.match(instructions.join(' '), /low heat/i);
  assert.doesNotMatch(instructions.join(' '), /\.\./);
});

test('supports legacy pages that mislabel directions as a second ingredient section', () => {
  const html = `<div class="english-detail-ff"><p>Ingredients:</p><p>-Flour 1 cup</p><p>Ingredients:</p><p>-Mix the flour with water.</p></div><div class="urdu-detail-ff"></div>`;
  const sections = scraper.parseRecipeSections(html);
  assert.deepEqual(sections.ingredientLines, ['-Flour 1 cup']);
  assert.deepEqual(sections.directionLines, ['-Mix the flour with water.']);
});

test('combines alternating ingredient and direction blocks without leaking labels', () => {
  const html = `<div class="english-detail-ff"><p>Ingredients:</p><p>-Flour 1 cup</p><p>Direction:</p><p>-Mix the flour.</p><p>Ingredients:</p><p>-Sugar 1 cup</p><p>Direction:</p><p>-Mix the sugar.</p></div><div class="urdu-detail-ff"></div>`;
  const sections = scraper.parseRecipeSections(html);
  assert.deepEqual(sections.ingredientLines, ['-Flour 1 cup', '-Sugar 1 cup']);
  assert.deepEqual(sections.directionLines, ['-Mix the flour.', '-Mix the sugar.']);
});

test('compresses long ingredient enumerations in method steps', () => {
  const result = scraper.compressIngredientEnumeration('Combine onion, tomato, garlic, ginger, cumin, coriander and blend until smooth.');
  assert.equal(result, 'Combine the listed ingredients and blend until smooth.');
});

test('tightens verbose functional steps without losing timing facts', () => {
  const result = scraper.tightenInstruction('In boiling water, place a rack and steam cook over low heat for 35-40 minutes.');
  assert.equal(result, 'Steam, covered, over low heat for 35-40 minutes.');
});

test('polishes checkpointed instruction punctuation', () => {
  assert.equal(scraper.polishInstruction('Carry out this step: mix well..'), 'At this point, mix well.');
});

test('balances truncated parenthetical notes in generated instructions', () => {
  assert.equal(scraper.polishInstruction('Cook until thick (about 5 minutes.'), 'Cook until thick (about 5 minutes).');
  assert.equal(scraper.polishInstruction('Rest for 10 minutes)).'), 'Rest for 10 minutes.');
});

test('normalizes a Food Fusion record without page links or images', () => {
  const recipe = scraper.parseRecipeRecord({
    id: 123,
    slug: 'test-sauce',
    modified: '2026-08-31T00:00:00',
    title: { rendered: 'Test Sauce' },
    class_list: ['recipe_category-chutneys-dips'],
    content: { rendered: '<p>Serves 4</p>' },
  }, SAMPLE_HTML);
  assert.equal(recipe.id, 'foodfusion-test-sauce-123');
  assert.equal(recipe.category, 'Chutneys & dips');
  assert.equal(recipe.servings, 4);
  assert.equal(recipe.times_minutes.cook, 11);
  assert.equal(recipe.ingredients.length, 3);
  assert.equal(recipe.source_attributions[0].url, undefined);
  assert.doesNotMatch(JSON.stringify(recipe), /https?:\/\//);
});
