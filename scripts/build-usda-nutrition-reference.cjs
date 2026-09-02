#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const NUTRIENTS = {
  1008: 'kcal',
  1003: 'protein_g',
  1005: 'carbs_g',
  1004: 'fat_g',
  1079: 'fiber_g',
  1089: 'iron_mg',
  1087: 'calcium_mg',
  1162: 'vitamin_c_mg',
  1093: 'sodium_mg',
};

const SELECTORS = {
  oil: { match: /oil, vegetable, soybean, refined/i },
  olive_oil: { match: /^oil, olive/i, prefer: /salad or cooking/i },
  butter: { match: /^butter, without salt$/i },
  salted_butter: { match: /^butter, salted$/i },
  ghee: { match: /^butter oil, anhydrous$/i },
  margarine: { match: /^margarine, regular/i, prefer: /80% fat/i },
  mayonnaise: { match: /salad dressing, mayonnaise, regular/i },
  sugar: { match: /^sugars, granulated$/i },
  brown_sugar: { match: /^sugars, brown$/i },
  honey: { match: /^honey$/i },
  molasses: { match: /^molasses$/i },
  wheat_flour: { match: /wheat flour, white, all-purpose/i, prefer: /enriched, bleached$/i },
  whole_wheat_flour: { match: /wheat flour, whole-grain/i },
  chickpea_flour: { match: /chickpea flour|gram flour/i },
  rice_flour: { match: /rice flour/i, reject: /babyfood/i },
  cornstarch: { match: /^cornstarch$/i },
  semolina: { match: /semolina, enriched/i },
  oats: { match: /cereals, oats, regular and quick, not fortified, dry/i },
  white_rice: { match: /rice, white, long-grain, regular, raw, enriched/i },
  brown_rice: { match: /rice, brown, long-grain, raw/i },
  pasta: { match: /^pasta, dry, enriched$/i },
  noodles: { match: /noodles, egg, dry, enriched/i },
  white_bread: { match: /bread, white, commercially prepared \(includes soft bread crumbs\)/i },
  breadcrumbs: { match: /bread, white, commercially prepared \(includes soft bread crumbs\)/i },
  biscuit: { match: /cookies, butter, commercially prepared/i },
  milk: { match: /milk, whole, 3\.25% milkfat/i, prefer: /with added vitamin d/i },
  yogurt: { match: /^yogurt, plain, whole milk$/i },
  cream: { match: /^cream, fluid, heavy whipping$/i },
  condensed_milk: { match: /milk, canned, condensed, sweetened/i },
  milk_powder: { match: /milk, dry, whole/i },
  cheddar: { match: /^cheese, cheddar \(/i },
  mozzarella: { match: /^cheese, mozzarella, whole milk$/i },
  cream_cheese: { match: /^cheese, cream$/i },
  cottage_cheese: { match: /^cheese, cottage, creamed/i, prefer: /large or small curd/i },
  egg: { match: /^egg, whole, raw, fresh$/i },
  chicken: { match: /^chicken, broilers or fryers, meat only, raw$/i },
  chicken_dark: { match: /^chicken, broilers or fryers, meat and skin, raw$/i },
  beef: { match: /beef, ground, 85% lean meat \/ 15% fat, raw/i },
  lamb: { match: /^lamb, ground, raw$/i },
  fish: { match: /^fish, .* raw$/i, prefer: /tilapia/i },
  shrimp: { match: /crustaceans, shrimp, mixed species, raw/i },
  tuna: { match: /fish, tuna, light, canned in water/i, prefer: /drained solids/i },
  onion: { match: /^onions, raw$/i },
  tomato: { match: /tomatoes, red, ripe, raw, year round average/i },
  potato: { match: /potatoes, flesh and skin, raw/i },
  sweet_potato: { match: /^sweet potato, raw, unprepared/i },
  carrot: { match: /^carrots, raw$/i },
  bell_pepper: { match: /peppers, sweet, green, raw/i },
  spinach: { match: /^spinach, raw$/i },
  cabbage: { match: /^cabbage, raw$/i },
  cauliflower: { match: /^cauliflower, raw$/i },
  cucumber: { match: /^cucumber, with peel, raw$/i },
  mushroom: { match: /^mushrooms, white, raw$/i },
  peas: { match: /^peas, green, raw$/i },
  corn: { match: /^corn, sweet, yellow, raw$/i },
  eggplant: { match: /^eggplant, raw$/i },
  okra: { match: /^okra, raw$/i },
  pumpkin: { match: /^pumpkin, raw$/i },
  chickpeas: { match: /chickpeas .* mature seeds, raw/i },
  lentils: { match: /^lentils, raw$/i },
  kidney_beans: { match: /beans, kidney, .* mature seeds, raw/i, prefer: /red/i },
  mung_beans: { match: /mung beans, mature seeds, raw/i },
  black_gram: { match: /mung beans, mature seeds, raw/i },
  apple: { match: /^apples, raw, with skin/i },
  banana: { match: /^bananas, raw$/i },
  mango: { match: /^mangos, raw$/i },
  orange: { match: /^oranges, raw, all commercial varieties$/i },
  lemon: { match: /^lemons, raw, without peel$/i },
  lemon_juice: { match: /^lemon juice, raw$/i },
  dates: { match: /^dates, deglet noor$/i },
  raisins: { match: /^raisins, dark, seedless/i },
  coconut: { match: /nuts, coconut meat, raw/i },
  coconut_milk: { match: /nuts, coconut milk, raw/i },
  strawberry: { match: /^strawberries, raw$/i },
  pineapple: { match: /^pineapple, raw, all varieties$/i },
  watermelon: { match: /^watermelon, raw$/i },
  papaya: { match: /^papayas, raw$/i },
  avocado: { match: /^avocados, raw, all commercial varieties$/i },
  almonds: { match: /^nuts, almonds$/i },
  cashews: { match: /^nuts, cashew nuts, raw$/i },
  pistachios: { match: /^nuts, pistachio nuts, raw$/i },
  walnuts: { match: /^nuts, walnuts, english$/i },
  peanuts: { match: /^peanuts, all types, raw$/i },
  sesame: { match: /^seeds, sesame seeds, whole, dried$/i },
  sunflower: { match: /seeds, sunflower seed kernels, dried/i },
  flax: { match: /^seeds, flaxseed$/i },
  chia: { match: /^seeds, chia seeds, dried$/i },
  ginger: { match: /^ginger root, raw$/i },
  garlic: { match: /^garlic, raw$/i },
  coriander: { match: /coriander \(cilantro\) leaves, raw/i },
  mint: { match: /^spearmint, fresh$/i },
  green_chili: { match: /peppers, hot chili, green, raw/i },
  cumin: { match: /^spices, cumin seed$/i },
  coriander_seed: { match: /^spices, coriander seed$/i },
  turmeric: { match: /^spices, turmeric, ground$/i },
  cinnamon: { match: /^spices, cinnamon, ground$/i },
  cocoa: { match: /cocoa, dry powder, unsweetened/i },
  chocolate: { match: /chocolate, dark, 45- 59% cacao solids/i },
  soy_sauce: { match: /^soy sauce made from soy and wheat \(shoyu\)$/i },
  ketchup: { match: /^catsup$/i },
  tomato_paste: { match: /^tomato products, canned, paste, without salt added/i },
  soda: { match: /^beverages, carbonated, lemon-lime soda, no caffeine$/i },
  tamarind: { match: /^tamarinds, raw$/i },
  mustard: { match: /^mustard, prepared, yellow$/i },
  instant_coffee: { match: /^beverages, coffee, instant, regular, powder$/i },
  yeast: { match: /^leavening agents, yeast, baker's, compressed$/i },
  olives: { match: /^olives, ripe, canned \(small-extra large\)$/i },
  lettuce: { match: /^lettuce, iceberg .* raw$/i },
  dried_plums: { match: /^plums, dried \(prunes\), uncooked$/i },
  cherry: { match: /^cherries, sweet, raw$/i },
  pomegranate: { match: /^pomegranates, raw$/i },
  gelatin: { match: /^gelatins, dry powder, unsweetened$/i },
  tapioca: { match: /^tapioca, pearl, dry$/i },
  barley: { match: /^barley, pearled, raw$/i },
  kiwi: { match: /^kiwifruit, green, raw$/i },
  peach: { match: /^peaches, yellow, raw$/i },
  grapes: { match: /^grapes, red or green .* raw$/i },
  figs: { match: /^figs, raw$/i },
};

function parseCsvLine(line) {
  const fields = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      fields.push(value);
      value = '';
    } else value += character;
  }
  fields.push(value);
  return fields;
}

function readCsv(filename) {
  const lines = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

function chooseFood(foods, selector) {
  const candidates = foods.filter((food) => selector.match.test(food.description) && !(selector.reject?.test(food.description)));
  if (!candidates.length) return null;
  return candidates.sort((left, right) => {
    const preferred = (food) => selector.prefer?.test(food.description) ? 1 : 0;
    return preferred(right) - preferred(left) || left.description.length - right.description.length || Number(left.fdc_id) - Number(right.fdc_id);
  })[0];
}

function main() {
  const directory = process.argv[2];
  const output = process.argv[3] || path.join('data', 'usda-sr-legacy-nutrition-reference.json');
  if (!directory) throw new Error('Provide the extracted USDA SR Legacy CSV directory.');
  const foods = readCsv(path.join(directory, 'food.csv'));
  const selected = {};
  const selectedByFdcId = new Map();
  const missing = [];
  for (const [key, selector] of Object.entries(SELECTORS)) {
    const food = chooseFood(foods, selector);
    if (!food) missing.push(key);
    else {
      const profile = { key, fdc_id: Number(food.fdc_id), description: food.description };
      selected[key] = profile;
      const matches = selectedByFdcId.get(food.fdc_id) || [];
      matches.push(profile);
      selectedByFdcId.set(food.fdc_id, matches);
    }
  }
  if (missing.length) throw new Error(`Missing USDA selections: ${missing.join(', ')}`);

  for (const row of readCsv(path.join(directory, 'food_nutrient.csv'))) {
    const nutrient = NUTRIENTS[row.nutrient_id];
    if (nutrient) for (const profile of selectedByFdcId.get(row.fdc_id) || []) profile[nutrient] = Number(row.amount);
  }
  const units = Object.fromEntries(readCsv(path.join(directory, 'measure_unit.csv')).map((row) => [row.id, row.name]));
  for (const row of readCsv(path.join(directory, 'food_portion.csv'))) {
    for (const profile of selectedByFdcId.get(row.fdc_id) || []) {
      profile.portions ||= [];
      profile.portions.push({
        amount: Number(row.amount),
        unit: units[row.measure_unit_id] || null,
        description: row.portion_description || row.modifier || null,
        grams: Number(row.gram_weight),
      });
    }
  }
  const profiles = Object.fromEntries(Object.values(selected).map((profile) => [profile.key, {
    ...profile,
    kcal: profile.kcal || 0,
    protein_g: profile.protein_g || 0,
    carbs_g: profile.carbs_g || 0,
    fat_g: profile.fat_g || 0,
    fiber_g: profile.fiber_g || 0,
    iron_mg: profile.iron_mg || 0,
    calcium_mg: profile.calcium_mg || 0,
    vitamin_c_mg: profile.vitamin_c_mg || 0,
    sodium_mg: profile.sodium_mg || 0,
  }]));
  const document = {
    schema_version: '1.0.0',
    source: 'USDA FoodData Central SR Legacy, April 2018 final release',
    source_url: 'https://fdc.nal.usda.gov/download-datasets/',
    nutrient_basis: 'Values are per 100 g edible portion.',
    generated_on: new Date().toISOString().slice(0, 10),
    profiles,
  };
  fs.writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(profiles).length} USDA profiles to ${output}`);
  for (const profile of Object.values(profiles)) console.log(`${profile.key}\t${profile.fdc_id}\t${profile.description}`);
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
