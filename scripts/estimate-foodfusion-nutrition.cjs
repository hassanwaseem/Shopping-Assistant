#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_REFERENCE = path.join('data', 'usda-sr-legacy-nutrition-reference.json');
const DEFAULT_STANDALONE = path.join('data', 'foodfusion-recipes.json');
const DEFAULT_MAIN = path.join('data', 'pakistani-recipes.json');
const DEFAULT_REPORT = path.join('data', 'foodfusion-nutrition-estimate-report.json');
const NUTRIENTS = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'iron_mg', 'calcium_mg', 'vitamin_c_mg', 'sodium_mg'];

const ZERO_PROFILE = Object.fromEntries(NUTRIENTS.map((key) => [key, 0]));
const SALT_PROFILE = { ...ZERO_PROFILE, sodium_mg: 38_758, description: 'Table salt approximation' };
const STOCK_PROFILE = { kcal: 250, protein_g: 16, carbs_g: 23, fat_g: 7, fiber_g: 0, iron_mg: 1, calcium_mg: 60, vitamin_c_mg: 0, sodium_mg: 24_000, description: 'Stock powder approximation' };

const MATCHERS = [
  ['zero', /\b(?:water|ice|charcoal|coal for smoke|food colou?r|essence|rose water|kewra water|citric acid|vinegar|baking soda|baking powder|room temperature|chilled|melted)\b/i],
  ['salt', /\b(?:salt|namak)\b/i],
  ['stock', /\b(?:stock|stock cubes?|chicken cubes?|chicken powder|stock powder|bouillon)\b/i],
  ['soda', /\b(?:7up|sprite|lemon-lime soda)\b/i],
  ['olive_oil', /\bolive oil\b/i],
  ['ghee', /\b(?:ghee|clarified butter|desi ghee)\b/i],
  ['margarine', /\b(?:margarine|blue band)\b/i],
  ['mayonnaise', /\b(?:mayonnaise|mayo)\b/i],
  ['butter', /\bbutter\b/i],
  ['oil', /\b(?:oil|dalda)\b/i],
  ['brown_sugar', /\bbrown sugar\b/i],
  ['honey', /\bhoney\b/i],
  ['molasses', /\b(?:molasses|jaggery|gur)\b/i],
  ['sugar', /\b(?:sugar|caster sugar|icing sugar|powdered sugar)\b/i],
  ['condensed_milk', /\bcondensed milk\b/i],
  ['condensed_milk', /\b(?:khoya|khoa|mawa)\b/i],
  ['milk_powder', /\b(?:milk powder|dry milk|powdered milk)\b/i],
  ['cream_cheese', /\bcream cheese\b/i],
  ['cottage_cheese', /\b(?:cottage cheese|paneer)\b/i],
  ['mozzarella', /\bmozzarella\b/i],
  ['cheddar', /\b(?:cheddar|cheese slice|processed cheese|cheese)\b/i],
  ['cream', /\b(?:cream|whipping cream|dairy cream|malai)\b/i],
  ['yogurt', /\b(?:yogurt|yoghurt|dahi)\b/i],
  ['milk', /\bmilk\b/i],
  ['chickpea_flour', /\b(?:gram flour|chickpea flour|besan|baisan)\b/i],
  ['rice_flour', /\brice flour\b/i],
  ['cornstarch', /\b(?:cornflour|corn flour|cornstarch|custard powder)\b/i],
  ['whole_wheat_flour', /\b(?:whole wheat flour|wheat flour|atta|super fine flour)\b/i],
  ['wheat_flour', /\b(?:all-purpose flour|plain flour|fine flour|maida|flour|dough|puff pastry)\b/i],
  ['semolina', /\b(?:semolina|suji|sooji)\b/i],
  ['oats', /\b(?:oats|oatmeal)\b/i],
  ['barley', /\bbarley\b/i],
  ['tapioca', /\b(?:tapioca|sago)\b/i],
  ['brown_rice', /\bbrown rice\b/i],
  ['rice_flour', /\b(?:rice paper|rice vermicelli)\b/i],
  ['white_rice', /\b(?:rice|chawal)\b/i],
  ['noodles', /\b(?:noodles|vermicelli|seviyan|spaghetti)\b/i],
  ['pasta', /\b(?:pasta|macaroni|lasagna|penne|fusilli)\b/i],
  ['breadcrumbs', /\b(?:breadcrumbs|bread crumbs|panko)\b/i],
  ['biscuit', /\b(?:biscuits?|cookies?)\b/i],
  ['white_bread', /\b(?:bread|buns?|croissants?|paratha|naan|roti|tortilla)\b/i],
  ['egg', /\b(?:egg|eggs|egg yolk|egg white)\b/i],
  ['shrimp', /\b(?:prawns?|shrimps?)\b/i],
  ['tuna', /\btuna\b/i],
  ['fish', /\b(?:fish|salmon|tilapia)\b/i],
  ['chicken', /\b(?:chicken|poultry)\b/i],
  ['lamb', /\b(?:mutton|lamb|goat)\b/i],
  ['beef', /\b(?:beef|veal|meat|mince|boti)\b/i],
  ['chickpeas', /\b(?:chickpeas?|chana|chanay|bengal gram)\b/i],
  ['black_gram', /\b(?:black gram|urad|mash daal|mash dal)\b/i],
  ['mung_beans', /\b(?:mung|moong|yellow lentil)\b/i],
  ['kidney_beans', /\b(?:kidney beans?|rajma|red beans?|white beans?)\b/i],
  ['lentils', /\b(?:lentils?|daal|dal)\b/i],
  ['sweet_potato', /\bsweet potatoes?\b/i],
  ['potato', /\b(?:potato(?:es)?|aloo)\b/i],
  ['tomato_paste', /\b(?:tomato paste|tomato puree)\b/i],
  ['tomato', /\btomato(?:es)?\b/i],
  ['onion', /\b(?:onions?|pyaz)\b/i],
  ['carrot', /\bcarrots?\b/i],
  ['bell_pepper', /\b(?:capsicum|bell pepper)\b/i],
  ['spinach', /\b(?:spinach|palak)\b/i],
  ['spinach', /\b(?:fresh|dried)?\s*fenugreek leaves?\b/i],
  ['cabbage', /\bcabbage\b/i],
  ['cauliflower', /\bcauliflower\b/i],
  ['cucumber', /\bcucumber\b/i],
  ['mushroom', /\bmushrooms?\b/i],
  ['lettuce', /\b(?:iceberg|lettuce|salad leaves?)\b/i],
  ['olives', /\bolives?\b/i],
  ['peas', /\bpeas?\b/i],
  ['corn', /\b(?:corn kernels?|kernel corns?|sweet corn|corn cobs?)\b/i],
  ['eggplant', /\b(?:eggplants?|aubergines?|brinjals?)\b/i],
  ['okra', /\b(?:okra|bhindi)\b/i],
  ['pumpkin', /\bpumpkin\b/i],
  ['avocado', /\bavocado\b/i],
  ['banana', /\bbananas?\b/i],
  ['apple', /\bapple\b/i],
  ['mango', /\bmango(?:es)?\b/i],
  ['orange', /\b(?:orange|mandarin)\b/i],
  ['lemon_juice', /\b(?:lemon juice|lime juice)\b/i],
  ['lemon', /\b(?:lemon|lime)\b/i],
  ['dates', /\b(?:dates?|dated|khajoor)\b/i],
  ['dried_plums', /\b(?:dried plums?|prunes?)\b/i],
  ['raisins', /\b(?:raisins?|kishmish)\b/i],
  ['coconut_milk', /\bcoconut milk\b/i],
  ['coconut', /\b(?:coconut|desiccated coconut)\b/i],
  ['strawberry', /\bstrawberr/i],
  ['pineapple', /\bpineapple\b/i],
  ['watermelon', /\bwater\s?melon\b/i],
  ['papaya', /\bpapaya\b/i],
  ['cherry', /\bcherr(?:y|ies)\b/i],
  ['pomegranate', /\bpomegranates?\b/i],
  ['kiwi', /\bkiwi(?:fruit)?\b/i],
  ['peach', /\bpeaches?\b/i],
  ['grapes', /\bgrapes?\b/i],
  ['figs', /\bfigs?\b/i],
  ['tamarind', /\btamarind\b/i],
  ['cashews', /\b(?:cashews?|kaju)\b/i],
  ['pistachios', /\b(?:pistachios?|pista)\b/i],
  ['walnuts', /\b(?:walnuts?|akhrot)\b/i],
  ['almonds', /\b(?:almonds?|badam)\b/i],
  ['peanuts', /\b(?:peanuts?|groundnuts?)\b/i],
  ['sesame', /\bsesame\b/i],
  ['sunflower', /\bsunflower seed\b/i],
  ['flax', /\bflax\b/i],
  ['chia', /\bchia\b/i],
  ['gelatin', /\bgelatin\b/i],
  ['yeast', /\b(?:instant )?yeast\b/i],
  ['instant_coffee', /\b(?:instant coffee|coffee powder)\b/i],
  ['ginger', /\bginger\b/i],
  ['garlic', /\bgarlic\b/i],
  ['coriander_seed', /\b(?:coriander seeds?|coriander powder)\b/i],
  ['coriander', /\b(?:fresh coriander|coriander(?: leaves?)?|cilantro|green coriander)\b/i],
  ['mint', /\bmint\b/i],
  ['green_chili', /\b(?:(?:green|red|button|kashmiri|thai) (?:chili(?:es|s)?|chilli(?:es|s)?)|jalapenos?|paprika|cayenne)\b/i],
  ['turmeric', /\bturmeric\b/i],
  ['cinnamon', /\bcinnamon\b/i],
  ['cumin', /\b(?:cumin|caraway seeds?|carom seeds?|fennel(?: seeds?| powder)|mustard seeds?|fenugreek seeds?|nigella seeds?|poppy seeds?|cardamoms?|cloves?|peppercorns?|pepper|star anise|masala|mixed herbs?|italian (?:herbs?|seasoning)|oregano|thyme|parsley|bay (?:leaf|leaves)|curry leaves?|basil(?: leaves?)?|dill|rosemary|saffron|sumac|mace|nutmeg|spices?)\b/i],
  ['cocoa', /\bcocoa\b/i],
  ['chocolate', /\bchocolate\b/i],
  ['soy_sauce', /\b(?:soy sauce|oyster sauce|fish sauce|worcestershire)\b/i],
  ['soy_sauce', /\bsoya sauce\b/i],
  ['mustard', /\b(?:mustard paste|prepared mustard|dijon mustard|mustard powder)\b/i],
  ['ketchup', /\b(?:ketchup|chilli sauce|chili sauce|hot sauce|bbq sauce|pizza sauce|sriracha)\b/i],
];

const FALLBACK_COUNT_GRAMS = {
  egg: 50, onion: 110, tomato: 123, potato: 213, sweet_potato: 150, carrot: 61,
  bell_pepper: 119, cucumber: 300, apple: 182, banana: 118, mango: 200, orange: 131,
  lemon: 58, dates: 7.1, green_chili: 15, garlic: 3, chicken: 150, chicken_dark: 150,
  beef: 120, lamb: 120, fish: 150, shrimp: 12, white_bread: 28, cheddar: 20,
  mozzarella: 20, biscuit: 12, almonds: 1.2, cashews: 1.6, pistachios: 0.6,
  walnuts: 4, strawberry: 12, pineapple: 165, papaya: 300, avocado: 150,
  cumin: 0.3, coriander_seed: 0.3, cinnamon: 2.6, turmeric: 3,
  ginger: 6, mint: 0.5, coriander: 0.5, sesame: 0.2,
  cherry: 8, kiwi: 75, peach: 150, grapes: 5, figs: 50, olives: 4,
};

const AS_NEEDED_GRAMS_PER_SERVING = {
  oil: 2, olive_oil: 2, ghee: 2, butter: 3, margarine: 3, mayonnaise: 8,
  sugar: 5, brown_sugar: 5, honey: 5, molasses: 5, soda: 100,
  cheddar: 10, mozzarella: 10, cream_cheese: 10, cottage_cheese: 15,
  cream: 15, condensed_milk: 10, milk: 30, yogurt: 20, chocolate: 8,
  ketchup: 8, soy_sauce: 5, mustard: 5, tomato_paste: 8,
  almonds: 5, cashews: 5, pistachios: 5, walnuts: 5, peanuts: 5,
  sesame: 3, sunflower: 3, flax: 3, chia: 3,
  apple: 30, banana: 30, mango: 30, orange: 30, lemon: 10, lemon_juice: 10,
  dates: 10, raisins: 8, coconut: 8, strawberry: 30, pineapple: 30,
  watermelon: 40, papaya: 30, avocado: 20, cherry: 20, pomegranate: 20,
  kiwi: 20, peach: 20, grapes: 20, figs: 15, tamarind: 8, dried_plums: 10,
  tomato: 20, onion: 10, potato: 25, carrot: 15, bell_pepper: 15,
  spinach: 10, cabbage: 15, cauliflower: 20, cucumber: 20, mushroom: 15,
  peas: 15, corn: 20, eggplant: 20, okra: 15, pumpkin: 20, lettuce: 15,
  olives: 8, chickpeas: 20, lentils: 20, kidney_beans: 20, mung_beans: 20,
  white_bread: 28, biscuit: 12, gelatin: 3, green_chili: 3,
  ginger: 2, garlic: 2, coriander: 1, mint: 1, cumin: 0.5,
  coriander_seed: 0.5, turmeric: 0.5, cinnamon: 0.5,
};

const PORTION_GRAMS = {
  'Chutneys & dips': 60, Drinks: 300, Soup: 300, Dessert: 120, Breads: 100,
  Kababs: 150, 'Rice & biryani': 300, 'Curries & stews': 300, 'Main Course': 300,
  'Snacks & street food': 160, 'Burgers & sandwiches': 300, 'Pasta, macaroni & lasagna': 300,
  Breakfast: 250, Salads: 200, 'Daal & legumes': 300, Healthy: 250,
};

function parseArgs(argv) {
  const options = { reference: DEFAULT_REFERENCE, standalone: DEFAULT_STANDALONE, main: DEFAULT_MAIN, report: DEFAULT_REPORT, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--reference') options.reference = argv[++index];
    else if (arg === '--standalone') options.standalone = argv[++index];
    else if (arg === '--main') options.main = argv[++index];
    else if (arg === '--report') options.report = argv[++index];
    else if (arg === '--dry-run') options.dryRun = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function normalize(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
}

function profileFor(ingredient, recipe, profiles) {
  // Food Fusion uses preparation text for section labels such as "for Beef Qorma".
  // Matching only the ingredient name prevents that label from turning every spice into beef.
  const text = normalize(ingredient.item);
  if (/\b(?:mince|qeema|boti)\b/i.test(text) && !/\b(?:beef|veal|mutton|lamb|goat|chicken)\b/i.test(text)) {
    const context = normalize(recipe.name);
    const key = /chicken/i.test(context) ? 'chicken' : /mutton|lamb|goat/i.test(context) ? 'lamb' : 'beef';
    return { key, profile: profiles[key] };
  }
  for (const [key, pattern] of MATCHERS) {
    if (!pattern.test(text)) continue;
    if (key === 'zero') return { key, profile: ZERO_PROFILE };
    if (key === 'salt') return { key, profile: SALT_PROFILE };
    if (key === 'stock') return { key, profile: STOCK_PROFILE };
    return { key, profile: profiles[key] };
  }
  return null;
}

function descriptionMatchesUnit(description, unit, preparation) {
  const text = normalize(description).toLowerCase();
  if (unit === 'cup') return /\bcup\b/.test(text) && !/whipped/.test(text);
  if (unit === 'tbsp') return /\b(?:tbsp|tablespoon)\b/.test(text);
  if (unit === 'tsp') return /\b(?:tsp|teaspoon)\b/.test(text);
  if (unit === 'slice') return /\bslice\b/.test(text);
  if (unit === 'packet') return /\b(?:packet|package)\b/.test(text);
  if (unit === 'count' || unit === 'piece' || ['medium', 'large', 'small'].includes(unit)) {
    const size = /\blarge\b/i.test(preparation) ? 'large' : /\bsmall\b/i.test(preparation) ? 'small' : /\bmedium\b/i.test(preparation) ? 'medium' : null;
    if (size) return new RegExp(`\\b${size}\\b`).test(text) && !/slice/.test(text);
    return /\b(?:medium|whole|egg|almond|date|fruit|unit)\b/.test(text) && !/slice|cup/.test(text);
  }
  return false;
}

function gramsFor(ingredient, match, servings) {
  const amount = Number(ingredient.amount);
  const unit = String(ingredient.unit || '').toLowerCase();
  const preparation = normalize(ingredient.preparation).toLowerCase();
  const profile = match?.profile;
  if (!Number.isFinite(amount) || amount <= 0) {
    const text = normalize(`${ingredient.item} ${ingredient.preparation || ''}`);
    if (/oil.*(?:fry|frying)|(?:fry|frying).*oil/i.test(text)) return { grams: servings * 8, inferred: true };
    if (match?.key === 'salt') return { grams: servings * 0.5, inferred: true };
    if (match?.key === 'butter') return { grams: servings * 5, inferred: true };
    if (['cheddar', 'mozzarella'].includes(match?.key) && /slice/i.test(text)) return { grams: servings * 20, inferred: true };
    if (match?.key === 'white_bread') return { grams: servings * 28, inferred: true };
    if (AS_NEEDED_GRAMS_PER_SERVING[match?.key]) return { grams: servings * AS_NEEDED_GRAMS_PER_SERVING[match.key], inferred: true };
    return { grams: null, inferred: false };
  }
  if (unit === 'g') return { grams: amount, inferred: false };
  if (unit === 'kg') return { grams: amount * 1000, inferred: false };
  if (unit === 'ml') return { grams: amount * (['oil', 'olive_oil'].includes(match?.key) ? 0.92 : 1), inferred: false };
  if (unit === 'l') return { grams: amount * 1000 * (['oil', 'olive_oil'].includes(match?.key) ? 0.92 : 1), inferred: false };
  if (['count', 'piece'].includes(unit) && ['cumin', 'coriander_seed', 'cinnamon', 'turmeric'].includes(match?.key)) {
    return { grams: amount * FALLBACK_COUNT_GRAMS[match.key], inferred: true };
  }
  if (profile?.portions) {
    const portion = profile.portions.find((entry) => descriptionMatchesUnit(entry.description, unit, preparation));
    if (portion) return { grams: amount * (portion.grams / portion.amount), inferred: false };
  }
  if (unit === 'cup') return { grams: amount * 240, inferred: true };
  if (unit === 'tbsp') return { grams: amount * 15, inferred: true };
  if (unit === 'tsp') return { grams: amount * 5, inferred: true };
  if (unit === 'clove') return { grams: amount * (match?.key === 'garlic' ? 3 : 0.2), inferred: true };
  if (unit === 'slice') return { grams: amount * (FALLBACK_COUNT_GRAMS[match?.key] || 25), inferred: true };
  if (['count', 'piece', 'medium', 'large', 'small'].includes(unit)) {
    let grams = FALLBACK_COUNT_GRAMS[match?.key] || 50;
    if (unit === 'large' || /\blarge\b/.test(preparation)) grams *= 1.25;
    if (unit === 'small' || /\bsmall\b/.test(preparation)) grams *= 0.7;
    return { grams: amount * grams, inferred: true };
  }
  if (unit === 'handful') return { grams: amount * 30, inferred: true };
  if (unit === 'pinch') return { grams: amount * 0.36, inferred: true };
  if (unit === 'leaf') return { grams: amount, inferred: true };
  if (unit === 'inch') return { grams: amount * 6, inferred: true };
  if (unit === 'bunch') return { grams: amount * 100, inferred: true };
  if (unit === 'tin') return { grams: amount * 400, inferred: true };
  return { grams: null, inferred: false };
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function estimateRecipe(recipe, profiles) {
  const initialServings = Number(recipe.servings) > 0 ? Number(recipe.servings) : 4;
  const rows = [];
  let convertibleWeight = 0;
  let matchedWeight = 0;
  let quantifiedMatchedWeight = 0;
  let relevantItems = 0;
  let matchedItems = 0;
  let inferredWeights = 0;
  const totals = Object.fromEntries(NUTRIENTS.map((key) => [key, 0]));
  const unmatched = [];

  for (const ingredient of recipe.ingredients || []) {
    const match = profileFor(ingredient, recipe, profiles);
    const weight = gramsFor(ingredient, match, initialServings);
    const zero = match?.key === 'zero';
    if (!zero) relevantItems += 1;
    if (weight.grams !== null) convertibleWeight += weight.grams;
    if (weight.inferred) inferredWeights += 1;
    if (!match || !match.profile) {
      if (!zero) unmatched.push(normalize(ingredient.item));
      continue;
    }
    if (!zero) matchedItems += 1;
    if (weight.grams === null) continue;
    matchedWeight += weight.grams;
    if (Number.isFinite(Number(ingredient.amount)) && Number(ingredient.amount) > 0) quantifiedMatchedWeight += weight.grams;
    rows.push({ ingredient, match, grams: weight.grams });
  }

  let servings = initialServings;
  let servingsBasis = recipe.servings_basis;
  for (const row of rows) {
    for (const nutrient of NUTRIENTS) totals[nutrient] += (Number(row.match.profile[nutrient]) || 0) * row.grams / 100;
  }
  if (quantifiedMatchedWeight > 0) {
    const portion = PORTION_GRAMS[recipe.category] || 250;
    const derived = Math.max(4, Math.min(30, Math.round(quantifiedMatchedWeight / portion)));
    const implausibleReportedYield = servingsBasis === 'source_reported'
      && totals.kcal / Math.max(1, servings) > 1500
      && quantifiedMatchedWeight / Math.max(1, servings) > 700
      && derived >= servings * 2;
    const yieldNeedsEstimation = ['default_estimate', 'estimated_from_ingredient_weight_for_nutrition'].includes(servingsBasis);
    if ((yieldNeedsEstimation && derived !== servings) || implausibleReportedYield) {
      servings = derived;
      servingsBasis = 'estimated_from_ingredient_weight_for_nutrition';
    }
  }
  const weightCoverage = convertibleWeight > 0 ? Math.min(1, matchedWeight / convertibleWeight) : 0;
  const itemCoverage = relevantItems > 0 ? matchedItems / relevantItems : 0;
  let confidence = weightCoverage >= 0.85 && itemCoverage >= 0.8 ? 'moderate' : weightCoverage >= 0.65 && itemCoverage >= 0.6 ? 'low-moderate' : 'low';
  if (servingsBasis !== 'source_reported' && confidence === 'moderate') confidence = 'low-moderate';
  if (servingsBasis === 'default_estimate') confidence = 'low';

  const perServing = Object.fromEntries(NUTRIENTS.map((key) => [key, totals[key] / Math.max(1, servings)]));
  const nutrition = {
    kcal: Math.round(perServing.kcal),
    protein_g: round(perServing.protein_g),
    carbs_g: round(perServing.carbs_g),
    fat_g: round(perServing.fat_g),
    fiber_g: round(perServing.fiber_g),
    iron_mg: round(perServing.iron_mg),
    calcium_mg: round(perServing.calcium_mg),
    vitamin_c_mg: round(perServing.vitamin_c_mg),
    sodium_mg: Math.round(perServing.sodium_mg),
    basis: 'ingredient_based_estimate_usda_sr_legacy',
    confidence,
    ingredient_weight_coverage: round(weightCoverage, 2),
    ingredient_item_coverage: round(itemCoverage, 2),
    estimation_note: 'Approximate planning value from ingredient quantities and USDA SR Legacy profiles; not laboratory analysis.',
  };
  return { nutrition, servings, servingsBasis, unmatched, inferredWeights };
}

function recipesIn(dataset) {
  return dataset.dish_families.flatMap((family) => family.variants || []);
}

function writeJson(filename, value, pretty = false) {
  const temporary = `${filename}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
  fs.renameSync(temporary, filename);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const reference = JSON.parse(fs.readFileSync(options.reference, 'utf8'));
  const standalone = JSON.parse(fs.readFileSync(options.standalone, 'utf8'));
  const mainDataset = JSON.parse(fs.readFileSync(options.main, 'utf8'));
  const estimates = new Map();
  const unmatchedCounts = new Map();
  const confidenceCounts = {};
  const coverage = [];
  const calories = [];
  let standaloneUpdated = 0;
  let servingsUpdated = 0;
  let recipesUsingEstimatedYield = 0;

  for (const recipe of recipesIn(standalone)) {
    const result = estimateRecipe(recipe, reference.profiles);
    recipe.nutrition_per_serving = result.nutrition;
    if (result.servings !== recipe.servings) {
      recipe.servings = result.servings;
      recipe.servings_basis = result.servingsBasis;
      servingsUpdated += 1;
    }
    if (recipe.servings_basis === 'estimated_from_ingredient_weight_for_nutrition') recipesUsingEstimatedYield += 1;
    const sourceId = Number(recipe.import_metadata.source_record_id);
    estimates.set(sourceId, { nutrition: result.nutrition, servings: recipe.servings, servings_basis: recipe.servings_basis });
    for (const item of result.unmatched) unmatchedCounts.set(item, (unmatchedCounts.get(item) || 0) + 1);
    confidenceCounts[result.nutrition.confidence] = (confidenceCounts[result.nutrition.confidence] || 0) + 1;
    coverage.push(result.nutrition.ingredient_weight_coverage);
    calories.push({ id: recipe.id, name: recipe.name, kcal: result.nutrition.kcal, confidence: result.nutrition.confidence });
    standaloneUpdated += 1;
  }

  let mainUpdated = 0;
  for (const recipe of recipesIn(mainDataset)) {
    const sourceId = Number(recipe.import_metadata?.source_record_id);
    const estimate = estimates.get(sourceId);
    if (!recipe.id.startsWith('foodfusion-') || !estimate) continue;
    recipe.nutrition_per_serving = estimate.nutrition;
    recipe.servings = estimate.servings;
    recipe.servings_basis = estimate.servings_basis;
    mainUpdated += 1;
  }

  standalone.nutrition_methodology = {
    source_values: 'Food Fusion pages do not expose standardized per-serving nutrition.',
    estimated_values: 'Calculated from parsed ingredient quantities, approximate edible weights, USDA FoodData Central SR Legacy profiles, and recipe servings.',
    caveat: 'Planning estimates only. Unquantified ingredients, frying absorption, brands, preparation losses, and estimated yields reduce precision.',
  };
  mainDataset.nutrition_methodology.foodfusion_estimates = 'New Food Fusion primary recipes use ingredient-based USDA SR Legacy estimates with per-recipe coverage and confidence labels.';
  mainDataset.generated_on = new Date().toISOString().slice(0, 10);

  const sortedCalories = [...calories].sort((left, right) => left.kcal - right.kcal);
  const report = {
    generated_at: new Date().toISOString(),
    reference: { source: reference.source, url: reference.source_url, profiles: Object.keys(reference.profiles).length },
    standalone_recipes_estimated: standaloneUpdated,
    merged_primary_recipes_updated: mainUpdated,
    recipes_using_ingredient_weight_serving_estimate: recipesUsingEstimatedYield,
    serving_estimates_changed_this_run: servingsUpdated,
    confidence_counts: confidenceCounts,
    average_ingredient_weight_coverage: round(coverage.reduce((sum, value) => sum + value, 0) / coverage.length, 3),
    calorie_distribution_per_serving: {
      minimum: sortedCalories[0],
      p05: sortedCalories[Math.floor(sortedCalories.length * 0.05)],
      median: sortedCalories[Math.floor(sortedCalories.length * 0.5)],
      p95: sortedCalories[Math.floor(sortedCalories.length * 0.95)],
      maximum: sortedCalories.at(-1),
    },
    plausibility_flags: {
      below_5_kcal: calories.filter((entry) => entry.kcal < 5),
      above_2500_kcal: calories.filter((entry) => entry.kcal > 2500),
    },
    top_unmatched_ingredients: [...unmatchedCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 200).map(([item, count]) => ({ item, count })),
  };

  if (options.dryRun) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  writeJson(options.standalone, standalone, true);
  writeJson(options.main, mainDataset);
  writeJson(options.report, report, true);
  console.log(`Estimated nutrition for ${standaloneUpdated} standalone Food Fusion recipes.`);
  console.log(`Updated ${mainUpdated} Food Fusion primary recipes in the merged dataset.`);
  console.log(`${recipesUsingEstimatedYield} recipes use an ingredient-weight serving estimate (${servingsUpdated} changed this run).`);
  console.log(`Wrote ${options.report}`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { estimateRecipe, gramsFor, profileFor };
