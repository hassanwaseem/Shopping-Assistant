'use strict';

function parseCookQuery(value) {
  const query = String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const parsed = { includeTerms: [], excludeTerms: [] };
  const time = query.match(/(?:under|within|up to|max(?:imum)?)\s*(\d{1,3})\s*(?:min|mins|minute|minutes)/);
  if (time) parsed.maxTime = Number(time[1]);
  const activeTime = query.match(/(?:active|hands-on)\s*(?:time)?\s*(?:under|within|up to|max(?:imum)?)?\s*(\d{1,3})/);
  if (activeTime) parsed.maxActiveTime = Number(activeTime[1]);
  if (/\b(dessert|sweet|ice cream|cake|pudding)\b/.test(query)) parsed.mealSlot = 'dessert';
  else if (/\b(tea|drink|coffee|chai|smoothie|shake)\b/.test(query)) parsed.mealSlot = 'tea';
  else if (/\bbreakfast\b/.test(query)) parsed.mealSlot = 'breakfast';
  else if (/\blunch\b/.test(query)) parsed.mealSlot = 'lunch';
  else if (/\b(dinner|tonight)\b/.test(query)) parsed.mealSlot = 'dinner';
  if (/\bvegetarian\b/.test(query)) parsed.diet = 'vegetarian';
  if (/\bvegan\b/.test(query)) parsed.diet = 'vegan';
  if (/\b(easy|simple|minimal effort)\b/.test(query)) parsed.difficulty = 'easy';
  if (/\b(warm|hot)\b/.test(query)) parsed.temperature = 'warm';
  if (/\b(cold|iced|chilled)\b/.test(query)) parsed.temperature = 'cold';
  if (/\b(healthy|lighter|balanced)\b/.test(query)) parsed.healthy = true;

  let positiveQuery = query;
  const exclusions = [...query.matchAll(/\b(?:without|excluding|exclude|avoid|no)\s+([a-z][a-z -]*?)(?=\s+(?:under|within|up to|for|with|using)\b|[,.]|$)/g)];
  for (const match of exclusions) {
    parsed.excludeTerms.push(...match[1].split(/\s+(?:and|or)\s+|\s*,\s*/).map((term) => term.trim()).filter(Boolean));
    positiveQuery = positiveQuery.replace(match[0], ' ');
  }

  const ignored = new Set([
    'something', 'want', 'make', 'cook', 'recipe', 'recipes', 'with', 'using', 'and', 'or', 'for', 'the', 'under', 'within', 'minutes', 'minute',
    'mins', 'dinner', 'tonight', 'lunch', 'breakfast', 'dessert', 'sweet', 'drink', 'warm', 'hot', 'cold', 'iced', 'chilled',
    'after', 'before', 'easy', 'simple', 'vegetarian', 'vegan', 'healthy', 'lighter', 'balanced', 'time', 'active', 'hands',
  ]);
  parsed.includeTerms = positiveQuery.replace(/\d+/g, ' ').split(/[^a-z]+/)
    .filter((term) => term.length > 2 && !ignored.has(term));
  parsed.includeTerms = [...new Set(parsed.includeTerms)];
  parsed.excludeTerms = [...new Set(parsed.excludeTerms)];
  return parsed;
}

function resetCookFilters({ keepSlot = false } = {}) {
  const slot = cookBrowser.mealSlot;
  Object.assign(cookBrowser, {
    query: '', mealSlot: keepSlot ? slot : 'dinner', maxTime: 'all', maxActiveTime: 'all', diet: 'all', difficulty: 'all', region: 'all',
    pantryFirst: false, minimalShopping: false, healthy: false, batchOnly: false, comfort: false, savedOnly: false,
    preset: null, tonight: false, overrideFields: [], resultOffset: 0,
  });
}

function applyCookPreset(preset) {
  resetCookFilters();
  cookBrowser.preset = preset;
  if (preset === 'tonight') { cookBrowser.mealSlot = 'dinner'; cookBrowser.tonight = true; }
  if (preset === 'quick') cookBrowser.maxTime = '20';
  if (preset === 'pantry') cookBrowser.pantryFirst = true;
  if (preset === 'minimal') cookBrowser.minimalShopping = true;
  if (preset === 'healthy') cookBrowser.healthy = true;
  if (preset === 'vegetarian') cookBrowser.diet = 'vegetarian';
  if (preset === 'comfort') cookBrowser.comfort = true;
  if (preset === 'batch') cookBrowser.batchOnly = true;
  if (preset === 'dessert') cookBrowser.mealSlot = 'dessert';
  if (preset === 'tea') cookBrowser.mealSlot = 'tea';
  if (preset === 'saved') cookBrowser.savedOnly = true;
}

function effectiveCookFilters() {
  const parsed = parseCookQuery(cookBrowser.query);
  const overridden = new Set(cookBrowser.overrideFields || []);
  return {
    parsed,
    mealSlot: !overridden.has('mealSlot') && parsed.mealSlot ? parsed.mealSlot : cookBrowser.mealSlot,
    maxTime: !overridden.has('maxTime') && parsed.maxTime ? parsed.maxTime : (cookBrowser.maxTime === 'all' ? null : Number(cookBrowser.maxTime)),
    maxActiveTime: !overridden.has('maxActiveTime') && parsed.maxActiveTime ? parsed.maxActiveTime : (cookBrowser.maxActiveTime === 'all' ? null : Number(cookBrowser.maxActiveTime)),
    diet: !overridden.has('diet') && parsed.diet ? parsed.diet : cookBrowser.diet,
    difficulty: !overridden.has('difficulty') && parsed.difficulty ? parsed.difficulty : cookBrowser.difficulty,
    region: cookBrowser.region,
    healthy: parsed.healthy || cookBrowser.healthy,
  };
}

function cookSearchText(recipe) {
  return [recipe.name, recipe.family, recipe.description, recipe.mainIngredient, ...(recipe.allergens || []), ...recipe.ingredients.map((item) => item.name)].join(' ').toLowerCase();
}

function temperatureMatches(recipe, temperature) {
  if (!temperature) return true;
  const text = cookSearchText(recipe);
  const cold = /\b(iced|ice|cold|chilled|smoothie|shake|lassi|sharbat|juice|mojito|mocktail|cooler|frappuccino)\b/.test(text);
  const warm = /\b(hot|warm|chai|tea|coffee|kahwa|kehwa|qahwa|cocoa|golden milk)\b/.test(text);
  return temperature === 'warm' ? warm && !cold : cold;
}

function isHealthyChoice(recipe, mealSlot) {
  const kcalLimit = { breakfast: 600, lunch: 750, dinner: 750, dessert: 350, tea: 250 }[mealSlot] || 750;
  const kcal = Number(recipe.nutrition?.kcal || 0);
  const protein = Number(recipe.nutrition?.protein || 0);
  const fibre = Number(recipe.nutrition?.fibre || 0);
  const sodium = Number(recipe.nutrition?.sodium || 0);
  const usefulNutrition = mealSlot === 'dessert' || mealSlot === 'tea'
    ? fibre >= 2 || protein >= 5
    : fibre >= 4 || protein >= 18;
  return kcal > 0 && kcal <= kcalLimit && usefulNutrition && (!sodium || sodium <= 900);
}

function cookCandidateRecipes() {
  const filters = effectiveCookFilters();
  return RECIPES.filter((recipe) => engine.isRecipeRecommendable(recipe, filters.mealSlot))
    .filter((recipe) => filters.diet === 'all' || filters.diet === 'balanced' || recipe.diets.includes(filters.diet))
    .filter((recipe) => filters.difficulty === 'all' || recipe.difficulty === filters.difficulty)
    .filter((recipe) => filters.region === 'all' || recipe.region === filters.region)
    .filter((recipe) => !filters.maxTime || recipe.totalTime <= filters.maxTime)
    .filter((recipe) => !filters.maxActiveTime || recipe.activeTime <= filters.maxActiveTime)
    .filter((recipe) => !recipe.allergens.some((allergen) => state.preferences.allergens.includes(allergen)))
    .filter((recipe) => !state.rejectedRecipeIds.includes(recipe.id))
    .filter((recipe) => !cookBrowser.savedOnly || state.savedRecipeIds.includes(recipe.id))
    .filter((recipe) => !cookBrowser.batchOnly || recipe.batchFriendly)
    .filter((recipe) => !filters.healthy || isHealthyChoice(recipe, filters.mealSlot))
    .filter((recipe) => temperatureMatches(recipe, filters.parsed.temperature))
    .filter((recipe) => {
      const haystack = cookSearchText(recipe);
      return filters.parsed.includeTerms.every((term) => haystack.includes(term))
        && filters.parsed.excludeTerms.every((term) => !haystack.includes(term));
    })
    .map((recipe) => {
      const match = pantryMatch(recipe);
      if (cookBrowser.pantryFirst && match.missing > 0) return null;
      if (cookBrowser.minimalShopping && match.missing > 5) return null;
      const difficultyPenalty = { easy: 0, medium: 5, hard: 12 }[recipe.difficulty] || 5;
      let score = engine.scoreRecipe(recipe, {
        mode: cookBrowser.pantryFirst || cookBrowser.minimalShopping ? 'pantry' : state.preferences.mode,
        focus: state.preferences.focus,
        focusWeight: focusWeight(),
        diet: filters.diet === 'all' ? state.preferences.diet : filters.diet,
        maxTime: filters.maxTime || state.preferences.maxTime,
        pantryItems: state.pantry,
        recentRecipeIds: state.recipeHistory || [],
        mealType: filters.mealSlot,
      });
      score += match.percent * 0.3 - match.missing * 2.5 - difficultyPenalty - recipe.totalTime * 0.03;
      if (filters.healthy) {
        score += Math.min(Number(recipe.nutrition?.fibre || 0), 12) * 2
          + Math.min(Number(recipe.nutrition?.protein || 0), 35) * 0.35
          - Math.max(0, Number(recipe.nutrition?.kcal || 0) - 550) * 0.04;
      }
      if (cookBrowser.comfort && /\b(curry|karahi|biryani|pulao|stew|soup|pasta|haleem|nihari|korma)\b/i.test(recipe.name)) score += 24;
      if (state.savedRecipeIds.includes(recipe.id)) score += 8;
      return { recipe, match, score };
    })
    .filter(Boolean);
}

function chooseDiverse(items, used, selected, value) {
  const candidates = items.filter((item) => !used.has(item.recipe.id));
  return candidates.sort((a, b) => {
    const penalty = (item) => selected.reduce((sum, previous) => sum
      + (item.recipe.region === previous.recipe.region ? 10 : 0)
      + (item.recipe.mainIngredient === previous.recipe.mainIngredient ? 14 : 0)
      + (item.recipe.method === previous.recipe.method ? 8 : 0), 0);
    return (value(b) - penalty(b)) - (value(a) - penalty(a));
  })[0] || null;
}

function cookRecommendations() {
  const candidates = cookCandidateRecipes();
  const hasPantry = state.pantry.some((item) => item.status !== 'out');
  const offset = cookBrowser.resultOffset % Math.max(candidates.length, 1);
  const rotate = (items) => items.length ? [...items.slice(offset % items.length), ...items.slice(0, offset % items.length)] : [];
  const groups = [
    { label: 'Best overall match', items: rotate([...candidates]), value: (item) => item.score },
    { label: 'Fastest and easiest', items: rotate([...candidates]), value: (item) => 120 - item.recipe.activeTime * 2 - item.recipe.totalTime * 0.5 - ({ easy: 0, medium: 20, hard: 45 }[item.recipe.difficulty] || 20) },
    {
      label: hasPantry ? 'Best pantry match' : 'Fewest missing ingredients',
      items: rotate([...candidates]),
      value: (item) => hasPantry
        ? item.match.percent * 2 - item.match.missing * 8 + item.score * 0.1
        : 120 - item.match.missing * 10 + item.score * 0.1,
    },
  ];
  const used = new Set();
  const selected = [];
  for (const group of groups) {
    const choice = chooseDiverse(group.items, used, selected, group.value);
    if (choice) {
      used.add(choice.recipe.id);
      selected.push({ ...choice, label: group.label });
    }
  }
  return selected;
}

function cookReason(result) {
  if (result.label.includes('Fastest')) return `${result.recipe.activeTime} min active, ${result.recipe.totalTime} min total and rated ${result.recipe.difficulty}.`;
  if (result.label.toLowerCase().includes('pantry')) return `${result.match.recorded} of ${result.match.total} required ingredients are recorded in your pantry.`;
  if (result.label.includes('missing')) return `${result.match.missing} required ingredients are not yet recorded at home.`;
  const facts = [];
  if (result.match.percent) facts.push(`${result.match.percent}% pantry coverage`);
  if (result.recipe.batchFriendly) facts.push('suitable for leftovers');
  facts.push(`${result.recipe.activeTime} min active time`);
  return facts.join(' · ');
}

function cookNoMatchMessage(filters) {
  const slot = SLOT_LABELS[filters.mealSlot].toLowerCase();
  if (cookBrowser.savedOnly) return `No saved recipes match the current ${slot} filters. Clear filters to see all saved recipes.`;
  if (cookBrowser.pantryFirst) return `No complete ${slot} can be made entirely from the recorded pantry. Try Minimal shopping to allow up to five missing ingredients.`;
  if (cookBrowser.minimalShopping) return `No ${slot} matches the five-missing-ingredient limit. Clear Minimal shopping to see compatible recipes.`;
  if (filters.maxTime) return `No ${slot} matches the ${filters.maxTime}-minute total-time limit. Increase the time limit to see more.`;
  if (filters.parsed.excludeTerms.length) return `No ${slot} matches the requested ingredients and exclusions. Allergies and exclusions were not relaxed.`;
  return `No compatible ${slot} matches all current filters. Clear one filter to see more choices.`;
}

function cookFilterSummary(filters) {
  const parts = [SLOT_LABELS[filters.mealSlot]];
  if (filters.maxTime) parts.push(`≤ ${filters.maxTime} min total`);
  if (filters.maxActiveTime) parts.push(`≤ ${filters.maxActiveTime} min active`);
  if (filters.diet !== 'all') parts.push(filters.diet);
  if (filters.difficulty !== 'all') parts.push(filters.difficulty);
  if (filters.parsed.includeTerms.length) parts.push(`includes ${filters.parsed.includeTerms.join(', ')}`);
  if (filters.parsed.excludeTerms.length) parts.push(`excludes ${filters.parsed.excludeTerms.join(', ')}`);
  if (filters.parsed.temperature) parts.push(filters.parsed.temperature);
  if (cookBrowser.pantryFirst) parts.push('only complete pantry matches');
  if (cookBrowser.minimalShopping) parts.push('maximum 5 missing ingredients');
  if (filters.healthy) parts.push('lighter complete meals');
  if (cookBrowser.comfort) parts.push('comfort food');
  if (cookBrowser.batchOnly) parts.push('batch-friendly');
  if (cookBrowser.savedOnly) parts.push('saved recipes only');
  return parts.join(' · ');
}

function renderCook() {
  const view = document.getElementById('view-cook');
  if (!view) return;
  const filters = effectiveCookFilters();
  const recommendations = cookRecommendations();
  const shortcuts = [
    ['tonight', 'Tonight'], ['quick', 'Under 20 minutes'], ['pantry', 'Use what we have'], ['minimal', 'Minimal shopping'],
    ['healthy', 'Something healthy'], ['vegetarian', 'Vegetarian'], ['comfort', 'Comfort food'], ['batch', 'Cook once, eat twice'],
    ['dessert', 'Add a dessert'], ['tea', 'Choose a drink'], ['saved', 'Saved recipes'],
  ];
  view.innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Recipe discovery</p><h2>What should we cook?</h2><p>Choose one clear direction, then refine it with filters or a natural-language request.</p></div><button class="button secondary" type="button" data-action="navigate" data-view="plan">Open weekly plan</button></div>
    ${lastRejectedRecipe ? `<section class="undo-banner" role="status"><span>${h(lastRejectedRecipe.name)} was hidden from recommendations.</span><button class="button secondary small" type="button" data-action="undo-rejected-recipe">Undo</button></section>` : ''}
    <section class="panel cook-search-panel">
      <label class="cook-query">Describe what you want<input id="cookQuery" type="search" value="${h(cookBrowser.query)}" placeholder="Chicken and rice under 30 minutes, or a warm drink without coffee" /></label>
      <div class="quick-choices" aria-label="Quick recipe filters">${shortcuts.map(([preset, label]) => `<button class="pill-button ${cookBrowser.preset === preset ? 'active' : ''}" type="button" data-action="cook-preset" data-preset="${preset}" aria-pressed="${cookBrowser.preset === preset}">${h(label)}</button>`).join('')}<button class="pill-button" type="button" data-action="clear-cook-filters">Clear filters</button></div>
      <p class="filter-summary"><strong>Active:</strong> ${h(cookFilterSummary(filters))}</p>
      <div class="cook-filters">
        <label>Meal<select data-action="cook-filter" data-field="mealSlot">${SLOTS.map((slot) => option(slot, SLOT_LABELS[slot], filters.mealSlot)).join('')}</select></label>
        <label>Total time<select data-action="cook-filter" data-field="maxTime">${option('all', 'Any time', filters.maxTime ? String(filters.maxTime) : 'all')}${option('20', 'Up to 20 min', filters.maxTime ? String(filters.maxTime) : 'all')}${option('30', 'Up to 30 min', filters.maxTime ? String(filters.maxTime) : 'all')}${option('45', 'Up to 45 min', filters.maxTime ? String(filters.maxTime) : 'all')}${option('60', 'Up to 1 hour', filters.maxTime ? String(filters.maxTime) : 'all')}</select></label>
        <label>Active time<select data-action="cook-filter" data-field="maxActiveTime">${option('all', 'Any active time', filters.maxActiveTime ? String(filters.maxActiveTime) : 'all')}${option('10', 'Up to 10 min', filters.maxActiveTime ? String(filters.maxActiveTime) : 'all')}${option('20', 'Up to 20 min', filters.maxActiveTime ? String(filters.maxActiveTime) : 'all')}${option('30', 'Up to 30 min', filters.maxActiveTime ? String(filters.maxActiveTime) : 'all')}</select></label>
        <label>Diet<select data-action="cook-filter" data-field="diet">${option('all', 'Any diet', filters.diet)}${option('vegetarian', 'Vegetarian', filters.diet)}${option('vegan', 'Vegan', filters.diet)}${option('high-protein', 'High protein', filters.diet)}</select></label>
        <label>Difficulty<select data-action="cook-filter" data-field="difficulty">${option('all', 'Any difficulty', filters.difficulty)}${option('easy', 'Easy', filters.difficulty)}${option('medium', 'Medium', filters.difficulty)}${option('hard', 'Hard', filters.difficulty)}</select></label>
        <label>Region<select data-action="cook-filter" data-field="region">${option('all', 'Any region', cookBrowser.region)}${REGIONS.map((region) => option(region, region, cookBrowser.region)).join('')}</select></label>
      </div>
    </section>
    <section class="recommendation-section">
      <div class="panel-header"><div><h3>Three useful directions</h3><p>${recommendations.length ? `Suitable ${h(SLOT_LABELS[filters.mealSlot].toLowerCase())} ideas with visibly different strengths.` : 'Adjust the filters to see compatible recipes.'}</p></div>${recommendations.length ? '<button class="button secondary small" type="button" data-action="show-another-cook">Show another set</button>' : ''}</div>
      <div class="recommendation-grid">${recommendations.map((result) => cookRecommendationCard(result, filters.mealSlot)).join('') || `<div class="empty-state"><h3>No compatible recipes found</h3><p>${h(cookNoMatchMessage(filters))}</p><button class="button secondary" type="button" data-action="clear-cook-filters">Clear filters</button></div>`}</div>
    </section>`;
}

function cookRecommendationCard(result, selectedSlot) {
  const recipe = result.recipe;
  const mainIngredients = [...new Set(recipe.ingredients.filter((item) => !item.optional && !['water', 'salt', 'ice'].includes(item.foodId)).map((item) => item.name))].slice(0, 4);
  const missingNames = [...result.match.unrecorded, ...result.match.partial].slice(0, 3);
  const drink = recipe.courseType === 'drink';
  return `<article class="recommendation-card"><span class="recommendation-label">${h(result.label)}</span><h3>${h(recipe.name)}</h3><p>${h(recipe.region)} · Suitable for ${h(SLOT_LABELS[selectedSlot])} · ${h(recipe.courseType)}</p><div class="recipe-card-meta"><span>${recipe.activeTime} min active</span><span>${recipe.totalTime} min total</span><span>${h(recipe.difficulty)}</span></div><p><strong>Main ingredients:</strong> ${h(mainIngredients.join(', ') || 'See recipe')}</p><p class="recommendation-reason">${h(cookReason(result))}</p><div class="pantry-meter"><strong>${result.match.percent}% pantry coverage</strong><span>${result.match.missing ? `${result.match.missing} still needed${missingNames.length ? `: ${missingNames.join(', ')}` : ''}` : 'All required ingredients recorded'}</span></div><p class="help">${recipe.batchFriendly ? 'Good leftover potential.' : drink ? 'Ready to make for the selected drink slot.' : 'Best suited to the selected meal.'}</p><div class="button-row"><button class="button" type="button" data-action="cook-now" data-recipe-id="${h(recipe.id)}">${drink ? 'Make now' : 'Cook now'}</button><button class="button secondary" type="button" data-action="view-recipe" data-recipe-id="${h(recipe.id)}">View recipe</button><button class="button secondary" type="button" data-action="open-add-to-plan" data-recipe-id="${h(recipe.id)}">Add to planner</button><button class="button ghost" type="button" data-action="save-recipe" data-recipe-id="${h(recipe.id)}">${state.savedRecipeIds.includes(recipe.id) ? 'Remove saved' : 'Save for later'}</button></div><details class="feedback-menu"><summary>Not interested</summary><div class="button-row"><button class="button ghost small" type="button" data-action="reject-recipe" data-recipe-id="${h(recipe.id)}" data-reason="not-interested">Not interested</button><button class="button ghost small" type="button" data-action="reject-recipe" data-recipe-id="${h(recipe.id)}" data-reason="too-difficult">Too difficult</button><button class="button ghost small" type="button" data-action="reject-recipe" data-recipe-id="${h(recipe.id)}" data-reason="too-long">Takes too long</button><button class="button ghost small" type="button" data-action="reject-recipe" data-recipe-id="${h(recipe.id)}" data-reason="too-many-missing">Too many missing ingredients</button><button class="button ghost small" type="button" data-action="reject-recipe" data-recipe-id="${h(recipe.id)}" data-reason="never">Do not suggest again</button></div></details></article>`;
}

function openAddToPlanDialog(recipeId) {
  const recipe = RECIPE_MAP[recipeId];
  if (!recipe) return;
  const dates = weekDates();
  const eligible = (recipe.eligibleMealSlots || recipe.mealSlots).filter((slot) => SLOTS.includes(slot));
  const today = isoDate(new Date());
  const todayIndex = dates.findIndex((date) => isoDate(date) === today);
  const defaultDayIndex = cookBrowser.tonight && todayIndex >= 0 ? todayIndex : Number(state.selectedPlanDay || 0);
  const preferredSlot = eligible.includes(effectiveCookFilters().mealSlot) ? effectiveCookFilters().mealSlot : eligible[0];
  const dialog = document.getElementById('addToPlanDialog');
  document.getElementById('addToPlanContent').innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">Add to planner</p><h2>${h(recipe.name)}</h2><p>Choose the day and a compatible meal slot.</p></div><button class="icon-button" type="button" data-action="close-add-to-plan" aria-label="Close">×</button></div><form id="addToPlanForm" data-recipe-id="${h(recipe.id)}"><div class="grid two"><label>Day<select name="dayIndex">${dates.map((date, index) => option(String(index), formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' }), String(defaultDayIndex))).join('')}</select></label><label>Meal<select name="slot">${eligible.map((slot) => option(slot, SLOT_LABELS[slot], preferredSlot)).join('')}</select></label></div><p class="help">If the slot already contains a suggestion, it will be replaced.</p><div class="button-row end"><button class="button secondary" type="button" data-action="close-add-to-plan">Cancel</button><button class="button" type="submit">Add to planner</button></div></form>`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

if (typeof module === 'object' && module.exports) module.exports = { parseCookQuery, isHealthyChoice };
