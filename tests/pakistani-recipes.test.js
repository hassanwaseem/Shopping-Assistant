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
  assert.equal(recipes.length, 4247);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, recipes.length);
  assert.ok(recipes.every((recipe) => ['Pakistani', 'Afghan'].includes(recipe.cuisine)));
  assert.ok(recipes.some((recipe) => recipe.cuisine === 'Afghan'));
  assert.ok(recipes.some((recipe) => /aloo paratha/i.test(recipe.name)));
  assert.equal(recipes.find((recipe) => recipe.name === 'Chapli Kabab Recipe').cuisine, 'Pakistani');
  assert.ok(recipes.some((recipe) => recipe.name === 'Kashmiri Chai'));
});

test('represents every imported Food Fusion recipe once and preserves duplicates as alternate methods', () => {
  const sourceRecipes = source.dish_families.flatMap((family) => family.variants || []);
  const foodFusionSources = sourceRecipes.flatMap((recipe) => (recipe.source_attributions || [])
    .filter((entry) => entry.source_name === 'Food Fusion')
    .map((entry) => ({ recipe, entry })));
  const foodFusionIds = foodFusionSources.map(({ entry }) => entry.source_record_id);
  const foodFusionAlternateMethods = sourceRecipes.flatMap((recipe) => (recipe.alternate_methods || [])
    .filter((method) => method.label.startsWith('Food Fusion alternate method')));

  assert.equal(source.source_inventory['Food Fusion'].recipe_records_imported, 3615);
  assert.equal(foodFusionSources.length, 3615);
  assert.equal(new Set(foodFusionIds).size, 3615);
  assert.equal(foodFusionAlternateMethods.length, 66);
  assert.ok(foodFusionSources.every(({ entry }) => !entry.url && !entry.source_url));
  assert.ok(foodFusionAlternateMethods.every((method) => (
    Array.isArray(method.instructions)
    && method.instructions.length > 0
    && method.source_urls.length === 0
  )));
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
  for (const slot of ['breakfast', 'lunch', 'dinner', 'dessert', 'tea']) {
    const candidates = recipes.filter((recipe) => recipe.mealSlots.includes(slot));
    assert.ok(candidates.length >= 10, `${slot} has only ${candidates.length} candidates`);
  }
});

test('classifies desserts and drinks into dedicated planner slots', () => {
  const iceCreams = recipes.filter((recipe) => /ice[ -]?cream/i.test(recipe.name));
  assert.ok(iceCreams.length > 10);
  assert.ok(iceCreams.every((recipe) => recipe.courseType === 'dessert'));
  assert.ok(iceCreams.every((recipe) => recipe.mealSlots.includes('dessert')));
  assert.ok(iceCreams.every((recipe) => !recipe.mealSlots.includes('dinner')));

  const chai = recipes.find((recipe) => recipe.name === 'Kashmiri Chai');
  assert.equal(chai.courseType, 'drink');
  assert.deepEqual(chai.mealSlots, ['tea']);
  assert.equal(chai.canBeStandalone, true);

  for (const name of [
    'Quick Strawberry Nutella Hand Pies',
    'Quick Whole Wheat Chocolate Muffins',
    'Apple Puff Pastry Tart',
    'Chocolate Lasagna',
  ]) {
    const dessert = recipes.find((recipe) => recipe.name === name);
    assert.ok(dessert, `${name} is missing`);
    assert.equal(dessert.courseType, 'dessert');
    assert.deepEqual(dessert.mealSlots, ['dessert']);
  }
});

test('keeps components, collections, and suspect source categories out of automatic suggestions', () => {
  const panjeeri = recipes.find((recipe) => recipe.name === 'Moong Daal Panjeeri');
  const masala = recipes.find((recipe) => recipe.name === 'Homemade Korma & Biryani Masala');
  const riceGuide = recipes.find((recipe) => recipe.name === 'How To Cook Basmati Rice');
  const steakPlatter = recipes.find((recipe) => recipe.name === 'Creamy Steak Rice Platter');
  const compilation = recipes.find((recipe) => recipe.name === '5 Uses Of Leftover Daal');

  assert.equal(panjeeri.courseType, 'dessert');
  assert.deepEqual(panjeeri.mealSlots, ['dessert']);
  assert.deepEqual(masala.mealSlots, []);
  assert.equal(masala.recommendationEligible, false);
  assert.deepEqual(riceGuide.mealSlots, []);
  assert.equal(compilation.recommendationEligible, false);
  assert.deepEqual(steakPlatter.mealSlots, ['lunch', 'dinner']);
  assert.equal(steakPlatter.courseType, 'main');

  for (const name of [
    'Homemade Khoya',
    'Ginger Paste',
    'Homemade Strawberry Syrup',
    'Homemade Chocolate Peanut Butter',
    'Homemade Kataifi Pastry (Kunafa Dough)',
    'Mango Jam',
    'Strawberry Jam',
    'Condensed Milk',
    'Homemade Mascarpone Cheese',
    'Homemade Tomato Puree',
    'How to Store Tomatoes',
    'Ginger,Garlic & Onion Powder',
    'Homemade Butter and Ghee',
    'Homemade Dahi/Yogurt',
    'Beef Paye Cleaning Method',
    '2 Homemade Nimko Recipes',
    'Apricot Jam (Hunza Special)',
    'Homemade Chicken Spread',
    'Homemade Puff Pastry',
    'Ricotta Cheese',
  ]) {
    const component = recipes.find((recipe) => recipe.name === name);
    assert.ok(component, `${name} is missing`);
    assert.equal(component.recommendationEligible, false, `${name} must not be recommended as a meal`);
  }
});

test('infers conservative times when imported records only time one method step', () => {
  const pasta = recipes.find((recipe) => recipe.name === 'Tandoori Chicken pasta');
  const mousse = recipes.find((recipe) => recipe.name === 'Chocolate Mousse Cups');
  assert.ok(pasta.activeTime >= 15);
  assert.ok(pasta.totalTime >= 25);
  assert.equal(pasta.timeConfidence, 'inferred');
  assert.ok(mousse.activeTime >= 10);
  assert.ok(mousse.totalTime >= 40);
  assert.equal(mousse.timeConfidence, 'inferred');
});

test('ingredient section labels do not corrupt pantry identities', () => {
  const recipe = recipes.find((item) => item.name === 'Chicken Pickled Onion (Khattay Pyaz)');
  const names = recipe.ingredients.map((ingredient) => ingredient.name);
  assert.equal(names.filter((name) => name === 'Onions').length, 2);
  assert.ok(names.includes('Chicken'));
  assert.ok(names.includes('Plain yogurt'));
  assert.ok(names.includes('Turmeric'));
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
