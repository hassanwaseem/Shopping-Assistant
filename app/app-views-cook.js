'use strict';

function parseCookQuery(value) {
  const query = String(value || '').toLowerCase();
  const parsed = {};
  const time = query.match(/(?:under|within|up to|max(?:imum)?)\s*(\d{1,3})\s*(?:min|minute)/);
  if (time) parsed.maxTime = Number(time[1]);
  if (/\b(dessert|sweet|ice cream|cake|pudding)\b/.test(query)) parsed.mealSlot = 'dessert';
  else if (/\b(tea|drink|coffee|chai|smoothie|shake)\b/.test(query)) parsed.mealSlot = 'tea';
  else if (/\bbreakfast\b/.test(query)) parsed.mealSlot = 'breakfast';
  else if (/\blunch\b/.test(query)) parsed.mealSlot = 'lunch';
  else if (/\b(dinner|tonight)\b/.test(query)) parsed.mealSlot = 'dinner';
  if (/\bvegetarian\b/.test(query)) parsed.diet = 'vegetarian';
  if (/\bvegan\b/.test(query)) parsed.diet = 'vegan';
  if (/\b(easy|simple|minimal effort)\b/.test(query)) parsed.difficulty = 'easy';
  const ignored = new Set(['something', 'with', 'and', 'under', 'within', 'minutes', 'minute', 'dinner', 'tonight', 'lunch', 'breakfast', 'dessert', 'drink', 'warm', 'cold', 'after', 'before', 'using', 'make', 'cook', 'easy', 'simple', 'vegetarian', 'vegan']);
  parsed.terms = query.replace(/\d+/g, ' ').split(/[^a-z]+/).filter((term) => term.length > 2 && !ignored.has(term));
  return parsed;
}

function cookCandidateRecipes() {
  const parsed = parseCookQuery(cookBrowser.query);
  const mealSlot = parsed.mealSlot || cookBrowser.mealSlot;
  const maxTime = parsed.maxTime || (cookBrowser.maxTime === 'all' ? null : Number(cookBrowser.maxTime));
  const diet = parsed.diet || cookBrowser.diet;
  const difficulty = parsed.difficulty || cookBrowser.difficulty;
  return RECIPES.filter((recipe) => engine.isRecipeEligible(recipe, mealSlot))
    .filter((recipe) => diet === 'all' || diet === 'balanced' || recipe.diets.includes(diet))
    .filter((recipe) => difficulty === 'all' || recipe.difficulty === difficulty)
    .filter((recipe) => !maxTime || recipe.totalTime <= maxTime)
    .filter((recipe) => !recipe.allergens.some((allergen) => state.preferences.allergens.includes(allergen)))
    .filter((recipe) => !state.rejectedRecipeIds.includes(recipe.id))
    .filter((recipe) => {
      if (!parsed.terms.length) return true;
      const haystack = [recipe.name, recipe.family, recipe.description, recipe.mainIngredient, ...recipe.ingredients.map((item) => item.name)].join(' ').toLowerCase();
      return parsed.terms.every((term) => haystack.includes(term));
    })
    .map((recipe) => {
      const match = pantryMatch(recipe);
      const score = engine.scoreRecipe(recipe, {
        mode: cookBrowser.pantryFirst ? 'pantry' : state.preferences.mode,
        focus: state.preferences.focus,
        focusWeight: focusWeight(),
        diet: diet === 'all' ? state.preferences.diet : diet,
        maxTime: maxTime || state.preferences.maxTime,
        pantryItems: state.pantry,
        recentRecipeIds: state.recipeHistory || [],
      }) + (cookBrowser.minimalShopping ? Math.max(0, 30 - match.missing * 4) : 0);
      return { recipe, match, score };
    });
}

function cookRecommendations() {
  const candidates = cookCandidateRecipes();
  const offset = cookBrowser.resultOffset % Math.max(candidates.length, 1);
  const rotate = (items) => items.length ? [...items.slice(offset % items.length), ...items.slice(0, offset % items.length)] : [];
  const lists = [
    { label: 'Best overall match', items: rotate([...candidates].sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name))) },
    { label: 'Fastest and easiest', items: rotate([...candidates].sort((a, b) => a.recipe.activeTime - b.recipe.activeTime || a.recipe.totalTime - b.recipe.totalTime || b.score - a.score)) },
    { label: 'Uses the most pantry items', items: rotate([...candidates].sort((a, b) => b.match.percent - a.match.percent || a.match.missing - b.match.missing || b.score - a.score)) },
  ];
  const used = new Set();
  return lists.map((group) => {
    const choice = group.items.find((item) => !used.has(item.recipe.id));
    if (choice) used.add(choice.recipe.id);
    return choice ? { ...choice, label: group.label } : null;
  }).filter(Boolean);
}

function cookReason(result) {
  if (result.label.includes('Fastest')) return `${result.recipe.activeTime} minutes of active preparation`;
  if (result.label.includes('pantry')) return `${result.match.percent}% of its listed ingredients match your pantry`;
  return reasonFor(result.recipe);
}

function renderCook() {
  const view = document.getElementById('view-cook');
  if (!view) return;
  const parsed = parseCookQuery(cookBrowser.query);
  const selectedSlot = parsed.mealSlot || cookBrowser.mealSlot;
  const recommendations = cookRecommendations();
  const shortcuts = [
    ['tonight', 'Tonight'], ['quick', 'Under 20 minutes'], ['pantry', 'Use what we have'], ['minimal', 'Minimal shopping'],
    ['healthy', 'Something healthy'], ['vegetarian', 'Vegetarian'], ['comfort', 'Comfort food'], ['batch', 'Cook once, eat twice'],
    ['dessert', 'Add a dessert'], ['tea', 'Choose a drink'],
  ];
  view.innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Recipe discovery</p><h2>What should we cook?</h2><p>Start with what matters tonight. We will show a few useful, compatible choices.</p></div><button class="button secondary" type="button" data-action="navigate" data-view="plan">Open weekly plan</button></div>
    <section class="panel cook-search-panel">
      <label class="cook-query">Describe what you want<input id="cookQuery" type="search" value="${h(cookBrowser.query)}" placeholder="Chicken and rice under 30 minutes, or a warm drink after dinner" /></label>
      <div class="quick-choices" aria-label="Quick recipe filters">${shortcuts.map(([preset, label]) => `<button class="pill-button" type="button" data-action="cook-preset" data-preset="${preset}">${h(label)}</button>`).join('')}</div>
      <div class="cook-filters">
        <label>Meal<select data-action="cook-filter" data-field="mealSlot">${SLOTS.map((slot) => option(slot, SLOT_LABELS[slot], selectedSlot)).join('')}</select></label>
        <label>Total time<select data-action="cook-filter" data-field="maxTime">${option('all', 'Any time', cookBrowser.maxTime)}${option('20', 'Up to 20 min', cookBrowser.maxTime)}${option('30', 'Up to 30 min', cookBrowser.maxTime)}${option('60', 'Up to 1 hour', cookBrowser.maxTime)}</select></label>
        <label>Diet<select data-action="cook-filter" data-field="diet">${option('all', 'Any diet', cookBrowser.diet)}${option('vegetarian', 'Vegetarian', cookBrowser.diet)}${option('vegan', 'Vegan', cookBrowser.diet)}${option('high-protein', 'High protein', cookBrowser.diet)}</select></label>
        <label>Difficulty<select data-action="cook-filter" data-field="difficulty">${option('all', 'Any difficulty', cookBrowser.difficulty)}${option('easy', 'Easy', cookBrowser.difficulty)}${option('medium', 'Medium', cookBrowser.difficulty)}${option('hard', 'Hard', cookBrowser.difficulty)}</select></label>
      </div>
    </section>
    <section class="recommendation-section">
      <div class="panel-header"><div><h3>Three useful directions</h3><p>${recommendations.length ? `Suitable ${h(SLOT_LABELS[selectedSlot].toLowerCase())} ideas, ranked using your filters.` : 'No recipes match all of these conditions.'}</p></div>${recommendations.length ? '<button class="button secondary small" type="button" data-action="show-another-cook">Show another set</button>' : ''}</div>
      <div class="recommendation-grid">${recommendations.map(cookRecommendationCard).join('') || `<div class="empty-state"><h3>No compatible recipes found</h3><p>Try increasing the time limit or removing one ingredient phrase. Allergies and strict dietary settings will not be relaxed.</p></div>`}</div>
    </section>`;
}

function cookRecommendationCard(result) {
  const recipe = result.recipe;
  return `<article class="recommendation-card"><span class="recommendation-label">${h(result.label)}</span><h3>${h(recipe.name)}</h3><p>${h(recipe.region)} · ${h(SLOT_LABELS[(recipe.eligibleMealSlots || recipe.mealSlots)[0]] || recipe.courseType)}</p><div class="recipe-card-meta"><span>${recipe.activeTime} min active</span><span>${recipe.totalTime} min total</span><span>${h(recipe.difficulty)}</span></div><p class="recommendation-reason">${h(cookReason(result))}</p><div class="pantry-meter"><strong>${result.match.percent}% pantry match</strong><span>${result.match.missing} ingredient${result.match.missing === 1 ? '' : 's'} not recorded</span></div><div class="button-row"><button class="button" type="button" data-action="view-recipe" data-recipe-id="${h(recipe.id)}">Cook this</button><button class="button secondary" type="button" data-action="open-add-to-plan" data-recipe-id="${h(recipe.id)}">Add to planner</button><button class="button ghost" type="button" data-action="save-recipe" data-recipe-id="${h(recipe.id)}">${state.savedRecipeIds.includes(recipe.id) ? 'Saved' : 'Save for later'}</button><button class="button ghost" type="button" data-action="reject-recipe" data-recipe-id="${h(recipe.id)}">Not interested</button></div></article>`;
}

function openAddToPlanDialog(recipeId) {
  const recipe = RECIPE_MAP[recipeId];
  if (!recipe) return;
  const dates = weekDates();
  const eligible = (recipe.eligibleMealSlots || recipe.mealSlots).filter((slot) => SLOTS.includes(slot));
  const dialog = document.getElementById('addToPlanDialog');
  document.getElementById('addToPlanContent').innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">Add to planner</p><h2>${h(recipe.name)}</h2><p>Choose the day and a compatible meal slot.</p></div><button class="icon-button" type="button" data-action="close-add-to-plan" aria-label="Close">×</button></div><form id="addToPlanForm" data-recipe-id="${h(recipe.id)}"><div class="grid two"><label>Day<select name="dayIndex">${dates.map((date, index) => option(String(index), formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' }), '0')).join('')}</select></label><label>Meal<select name="slot">${eligible.map((slot) => option(slot, SLOT_LABELS[slot], eligible[0])).join('')}</select></label></div><p class="help">If the slot already contains a suggestion, it will be replaced.</p><div class="button-row end"><button class="button secondary" type="button" data-action="close-add-to-plan">Cancel</button><button class="button" type="submit">Add to planner</button></div></form>`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}
