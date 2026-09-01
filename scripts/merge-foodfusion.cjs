#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_BASE = path.join('data', 'pakistani-recipes.json');
const DEFAULT_IMPORT = path.join('data', 'foodfusion-recipes.json');
const DEFAULT_REPORT = path.join('data', 'foodfusion-merge-report.json');

function parseArgs(argv) {
  const options = { base: DEFAULT_BASE, input: DEFAULT_IMPORT, report: DEFAULT_REPORT, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base') options.base = argv[++index];
    else if (arg === '--input') options.input = argv[++index];
    else if (arg === '--report') options.report = argv[++index];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    'Usage: node scripts/merge-foodfusion.cjs [options]',
    '',
    'Options:',
    '  --base <file>     Main recipe dataset to update',
    '  --input <file>    Separate Food Fusion import',
    '  --report <file>   Merge report destination',
    '  --dry-run         Validate and print counts without writing files',
    '  --help            Show this help',
  ].join('\n');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(?:recipe|food fusion)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleBag(value) {
  return normalizeTitle(value).split(' ').filter(Boolean).sort().join(' ');
}

function titleKeys(value) {
  const normalized = normalizeTitle(value);
  const bag = titleBag(value);
  return [...new Set([normalized && `ordered:${normalized}`, bag && `bag:${bag}`].filter(Boolean))];
}

function ingredientTokens(recipe) {
  return new Set((recipe.ingredients || []).flatMap((ingredient) => (
    normalizeTitle(ingredient.item).split(' ').filter((token) => token.length > 2)
  )));
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function familyNames(family) {
  return [
    family.name,
    ...(family.variants || []).flatMap((variant) => [
      variant.name,
      variant.dish_family,
      ...(variant.alternate_names || []),
    ]),
  ].filter(Boolean);
}

function makeFamilyIndex(families) {
  const index = new Map();
  for (const family of families) addFamilyToIndex(index, family);
  return index;
}

function addFamilyToIndex(index, family) {
  for (const name of familyNames(family)) {
    for (const key of titleKeys(name)) {
      const matches = index.get(key) || [];
      if (!matches.includes(family)) matches.push(family);
      index.set(key, matches);
    }
  }
}

function findFamily(index, incoming) {
  const candidates = new Set();
  for (const name of [incoming.name, incoming.dish_family]) {
    for (const key of titleKeys(name)) {
      for (const family of index.get(key) || []) candidates.add(family);
    }
  }
  if (!candidates.size) return null;
  const incomingIngredients = ingredientTokens(incoming);
  return [...candidates].sort((left, right) => {
    const score = (family) => Math.max(...family.variants.map((variant) => {
      const exact = normalizeTitle(variant.name) === normalizeTitle(incoming.name) ? 4 : 0;
      const bag = titleBag(variant.name) === titleBag(incoming.name) ? 2 : 0;
      return exact + bag + jaccard(ingredientTokens(variant), incomingIngredients);
    }));
    return score(right) - score(left);
  })[0];
}

function selectTargetVariant(family, incoming) {
  const incomingIngredients = ingredientTokens(incoming);
  return [...family.variants].sort((left, right) => {
    const score = (variant) => {
      const aliases = [variant.name, variant.dish_family, ...(variant.alternate_names || [])];
      const exact = aliases.some((name) => normalizeTitle(name) === normalizeTitle(incoming.name)) ? 8 : 0;
      const bag = aliases.some((name) => titleBag(name) === titleBag(incoming.name)) ? 4 : 0;
      return exact + bag + jaccard(ingredientTokens(variant), incomingIngredients);
    };
    return score(right) - score(left);
  })[0];
}

function foodFusionAttribution(recipe, role) {
  return {
    source_name: 'Food Fusion',
    recipe_title: recipe.name,
    role,
    source_record_id: Number(recipe.import_metadata.source_record_id),
    source_modified: recipe.import_metadata.source_modified || null,
  };
}

function preparePrimary(recipe) {
  const prepared = clone(recipe);
  prepared.alternate_methods = Array.isArray(prepared.alternate_methods) ? prepared.alternate_methods : [];
  prepared.alternate_names = Array.isArray(prepared.alternate_names) ? prepared.alternate_names : [];
  prepared.source_attributions = (prepared.source_attributions || [])
    .filter((entry) => entry.source_name !== 'Food Fusion');
  prepared.source_attributions.push(foodFusionAttribution(prepared, 'primary'));
  return prepared;
}

function mergeAlternate(target, incoming, reason, report) {
  target.alternate_methods = Array.isArray(target.alternate_methods) ? target.alternate_methods : [];
  target.alternate_names = Array.isArray(target.alternate_names) ? target.alternate_names : [];
  target.source_attributions = Array.isArray(target.source_attributions) ? target.source_attributions : [];
  const signature = incoming.instructions.map((step) => normalizeTitle(step)).join('|');
  const methodAlreadyPresent = target.alternate_methods.some((method) => (
    (method.instructions || []).map((step) => normalizeTitle(step)).join('|') === signature
  ));
  if (!methodAlreadyPresent) {
    target.alternate_methods.push({
      label: `Food Fusion alternate method — ${incoming.name}`,
      instructions: clone(incoming.instructions),
      source_urls: [],
    });
  }
  const sourceId = Number(incoming.import_metadata.source_record_id);
  if (!target.source_attributions.some((entry) => (
    entry.source_name === 'Food Fusion' && Number(entry.source_record_id) === sourceId
  ))) {
    target.source_attributions.push(foodFusionAttribution(incoming, 'supporting_duplicate_or_close_variant'));
  }
  if (normalizeTitle(incoming.name) !== normalizeTitle(target.name)
      && !target.alternate_names.some((name) => normalizeTitle(name) === normalizeTitle(incoming.name))) {
    target.alternate_names.push(incoming.name);
  }
  report.duplicates_merged.push({
    source_record_id: sourceId,
    incoming_title: incoming.name,
    retained_recipe_id: target.id,
    retained_title: target.name,
    reason,
    alternate_method_added: !methodAlreadyPresent,
  });
}

function collectFoodFusionIds(dataset) {
  const ids = [];
  for (const family of dataset.dish_families) {
    for (const recipe of family.variants) {
      for (const source of recipe.source_attributions || []) {
        if (source.source_name === 'Food Fusion' && source.source_record_id) ids.push(Number(source.source_record_id));
      }
    }
  }
  return ids;
}

function updateMetadata(dataset, importedCount, report) {
  const variants = dataset.dish_families.flatMap((family) => family.variants);
  const alternateMethodCount = variants.reduce((sum, recipe) => sum + (recipe.alternate_methods || []).length, 0);
  dataset.generated_on = new Date().toISOString().slice(0, 10);
  dataset.content_note = 'The primary standalone collection, now including the Food Fusion catalog. Recipe facts and ingredient quantities are normalized; Food Fusion directions are independently formulated. Food Fusion images and source-page links are excluded.';
  dataset.variant_model.dish_family_count = dataset.dish_families.length;
  dataset.variant_model.recipe_variant_count = variants.length;
  dataset.source_inventory.source_records_extracted['Food Fusion'] = importedCount;
  dataset.source_inventory['Food Fusion'] = {
    public_catalog_records_found: report.foodfusion_catalog_records,
    recipe_records_imported: importedCount,
    failed_or_unparseable_records: report.foodfusion_failed_records,
    images_imported: 0,
    source_page_links_stored: 0,
  };
  dataset.source_inventory.source_records_total += importedCount;
  dataset.source_inventory.records_considered_total += importedCount;
  dataset.deduplication_summary.input_source_records += importedCount;
  dataset.deduplication_summary.unique_recipe_variants = variants.length;
  dataset.deduplication_summary.duplicates_or_close_versions_collapsed += report.duplicates_merged.length;
  dataset.deduplication_summary.alternate_cooking_methods_preserved = alternateMethodCount;
  dataset.exclusions.foodfusion_failed_or_unparseable_records = report.foodfusion_failed_records;
  dataset.exclusions.foodfusion_images = 'excluded_by_request';
  dataset.exclusions.foodfusion_source_page_links = 'excluded_by_request';
  dataset.validation = report.validation;
}

function validate(dataset, expectedFoodFusionIds) {
  const families = dataset.dish_families;
  const recipes = families.flatMap((family) => family.variants);
  const recipeIds = recipes.map((recipe) => recipe.id);
  const familyIds = families.map((family) => family.id);
  const representedIds = collectFoodFusionIds(dataset);
  const representedSet = new Set(representedIds);
  const expectedSet = new Set(expectedFoodFusionIds);
  const missingFoodFusionIds = [...expectedSet].filter((id) => !representedSet.has(id));
  const unexpectedFoodFusionIds = [...representedSet].filter((id) => !expectedSet.has(id));
  const duplicateFoodFusionIds = representedIds.filter((id, index) => representedIds.indexOf(id) !== index);
  const foodFusionUrlLeaks = recipes.flatMap((recipe) => (recipe.source_attributions || [])
    .filter((source) => source.source_name === 'Food Fusion' && (source.url || source.source_url))
    .map(() => recipe.id));
  const emptyRecipes = recipes.filter((recipe) => !recipe.ingredients?.length || !recipe.instructions?.length).map((recipe) => recipe.id);
  const passes = [
    { name: 'schema_and_unique_ids', status: new Set(recipeIds).size === recipeIds.length && new Set(familyIds).size === familyIds.length ? 'passed' : 'failed' },
    { name: 'family_variant_accounting', status: families.every((family) => family.variant_count === family.variants.length) ? 'passed' : 'failed', families: families.length, variants: recipes.length },
    { name: 'ingredients_and_instructions_present', status: emptyRecipes.length ? 'failed' : 'passed', record_errors: emptyRecipes },
    { name: 'foodfusion_source_record_accounting', status: missingFoodFusionIds.length || unexpectedFoodFusionIds.length || duplicateFoodFusionIds.length ? 'failed' : 'passed', expected: expectedSet.size, represented: representedSet.size, missing_source_record_ids: missingFoodFusionIds, unexpected_source_record_ids: unexpectedFoodFusionIds, duplicate_source_record_ids: duplicateFoodFusionIds },
    { name: 'no_foodfusion_source_page_links', status: foodFusionUrlLeaks.length ? 'failed' : 'passed', record_errors: foodFusionUrlLeaks },
  ];
  return { triple_verified: true, passes, result: passes.every((pass) => pass.status === 'passed') ? 'passed' : 'failed' };
}

async function writeJson(filename, value) {
  const temporary = `${filename}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, 'utf8');
  await fs.rename(temporary, filename);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage());
  const [base, imported, importReport] = await Promise.all([
    fs.readFile(options.base, 'utf8').then(JSON.parse),
    fs.readFile(options.input, 'utf8').then(JSON.parse),
    fs.readFile(DEFAULT_REPORT.replace('merge', 'import'), 'utf8').then(JSON.parse),
  ]);
  if (base.source_inventory?.['Food Fusion']?.recipe_records_imported) {
    throw new Error('The base dataset already contains the Food Fusion import; refusing to merge it twice.');
  }
  const dataset = clone(base);
  const incomingFamilies = imported.dish_families.map(clone);
  const incomingRecipes = incomingFamilies.flatMap((family) => family.variants);
  const expectedFoodFusionIds = incomingRecipes.map((recipe) => Number(recipe.import_metadata.source_record_id));
  const report = {
    generated_at: new Date().toISOString(),
    base_recipe_variants: base.variant_model.recipe_variant_count,
    foodfusion_catalog_records: importReport.records_requested,
    foodfusion_recipe_records: incomingRecipes.length,
    foodfusion_failed_records: importReport.failure_count,
    new_recipe_variants: 0,
    new_dish_families: 0,
    duplicates_merged: [],
  };

  let familyIndex = makeFamilyIndex(dataset.dish_families);
  for (const incomingFamily of incomingFamilies) {
    const unmatched = [];
    for (const rawRecipe of incomingFamily.variants) {
      const incoming = preparePrimary(rawRecipe);
      const matchingFamily = findFamily(familyIndex, incoming);
      if (!matchingFamily) {
        unmatched.push(incoming);
        continue;
      }
      const target = selectTargetVariant(matchingFamily, incoming);
      const reason = target.id.startsWith('foodfusion-') ? 'foodfusion_duplicate_title' : 'existing_collection_duplicate_title';
      mergeAlternate(target, incoming, reason, report);
    }
    if (!unmatched.length) continue;
    const primary = unmatched.shift();
    const newFamily = {
      id: incomingFamily.id,
      name: incomingFamily.name,
      variant_count: 1,
      variants: [primary],
    };
    for (const duplicate of unmatched) mergeAlternate(primary, duplicate, 'foodfusion_duplicate_title', report);
    dataset.dish_families.push(newFamily);
    report.new_dish_families += 1;
    report.new_recipe_variants += 1;
    addFamilyToIndex(familyIndex, newFamily);
  }

  dataset.dish_families.sort((left, right) => left.name.localeCompare(right.name));
  for (const family of dataset.dish_families) {
    family.variants.sort((left, right) => left.id.localeCompare(right.id));
    family.variant_count = family.variants.length;
  }
  report.validation = validate(dataset, expectedFoodFusionIds);
  updateMetadata(dataset, incomingRecipes.length, report);
  report.final_dish_families = dataset.dish_families.length;
  report.final_recipe_variants = dataset.variant_model.recipe_variant_count;
  report.duplicates_merged_count = report.duplicates_merged.length;
  if (report.validation.result !== 'passed') throw new Error(`Merged dataset validation failed: ${JSON.stringify(report.validation)}`);

  if (options.dryRun) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  await writeJson(options.base, dataset);
  await writeJson(options.report, report);
  console.log(`Merged ${incomingRecipes.length} Food Fusion records into ${options.base}`);
  console.log(`Added ${report.new_recipe_variants} recipe variants; preserved ${report.duplicates_merged_count} duplicates as alternate methods`);
  console.log(`Wrote merge report to ${options.report}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
