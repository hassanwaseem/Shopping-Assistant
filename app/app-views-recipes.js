'use strict';

function filteredRecipes() {
  const query = recipeBrowser.search.trim().toLowerCase();
  return RECIPES.filter((recipe) => {
    if (recipeBrowser.region !== 'all' && recipe.region !== recipeBrowser.region) return false;
    if (recipeBrowser.dishType !== 'all' && recipe.dishType !== recipeBrowser.dishType) return false;
    if (recipeBrowser.mainIngredient !== 'all' && recipe.mainIngredient !== recipeBrowser.mainIngredient) return false;
    if (recipeBrowser.diet !== 'all' && !recipe.diets.includes(recipeBrowser.diet)) return false;
    if (recipeBrowser.maxTime !== 'all' && recipe.totalTime > Number(recipeBrowser.maxTime)) return false;
    if (!query) return true;
    const haystack = [
      recipe.name,
      ...recipe.alternateNames,
      recipe.family,
      recipe.cuisine,
      recipe.region,
      recipe.dishType,
      recipe.mainIngredient,
      recipe.description,
      ...recipe.ingredients.flatMap((item) => [item.name, item.displayText]),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => {
    if (a.cuisine !== b.cuisine) return a.cuisine === 'Pakistani' ? -1 : 1;
    return REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region)
      || a.dishType.localeCompare(b.dishType)
      || a.name.localeCompare(b.name);
  });
}

function renderRecipes() {
  const view = document.getElementById('view-recipes');
  if (!view) return;
  if (!document.getElementById('recipeSearch')) {
    view.innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Pakistani recipe library</p><h2>Browse complete recipes</h2><p>Explore regional dishes, ingredients, full cooking methods and nutrition estimates.</p></div></div>
      <section class="panel soft-panel">
        <div class="recipe-filters">
          <label class="recipe-search-field">Search<input id="recipeSearch" type="search" value="${h(recipeBrowser.search)}" placeholder="Dish, ingredient, family or region" /></label>
          <label>Region<select data-action="recipe-filter" data-field="region">${option('all', 'All regions', recipeBrowser.region)}${REGIONS.map((region) => option(region, region, recipeBrowser.region)).join('')}</select></label>
          <label>Dish type<select data-action="recipe-filter" data-field="dishType">${option('all', 'All dish types', recipeBrowser.dishType)}${DISH_TYPES.map((type) => option(type, type, recipeBrowser.dishType)).join('')}</select></label>
          <label>Main ingredient<select data-action="recipe-filter" data-field="mainIngredient">${option('all', 'Any main ingredient', recipeBrowser.mainIngredient)}${MAIN_INGREDIENTS.map((type) => option(type, type, recipeBrowser.mainIngredient)).join('')}</select></label>
          <label>Diet<select data-action="recipe-filter" data-field="diet">${option('all', 'All dietary patterns', recipeBrowser.diet)}${option('vegetarian', 'Vegetarian', recipeBrowser.diet)}${option('vegan', 'Vegan', recipeBrowser.diet)}${option('high-protein', 'High protein', recipeBrowser.diet)}</select></label>
          <label>Total time<select data-action="recipe-filter" data-field="maxTime">${option('all', 'Any cooking time', recipeBrowser.maxTime)}${option('30', 'Up to 30 minutes', recipeBrowser.maxTime)}${option('60', 'Up to 1 hour', recipeBrowser.maxTime)}${option('120', 'Up to 2 hours', recipeBrowser.maxTime)}</select></label>
        </div>
        <p id="recipeResultSummary" class="help"></p>
      </section>
      <div id="recipeResults" class="recipe-grid"></div>
      <div id="recipePagination" class="pagination" aria-label="Recipe pages"></div>`;
  }
  renderRecipeResults();
}

function renderRecipeResults() {
  const filtered = filteredRecipes();
  const pageCount = Math.max(1, Math.ceil(filtered.length / recipeBrowser.pageSize));
  recipeBrowser.page = Math.min(recipeBrowser.page, pageCount - 1);
  const start = recipeBrowser.page * recipeBrowser.pageSize;
  const visible = filtered.slice(start, start + recipeBrowser.pageSize);
  const summary = document.getElementById('recipeResultSummary');
  const results = document.getElementById('recipeResults');
  const pagination = document.getElementById('recipePagination');
  if (!summary || !results || !pagination) return;
  summary.textContent = filtered.length
    ? `Showing recipes ${start + 1}–${Math.min(start + recipeBrowser.pageSize, filtered.length)}`
    : 'No matching recipes';
  results.innerHTML = visible.map((recipe) => recipeCard(recipe)).join('')
    || '<div class="empty-state">No recipes match these filters.</div>';
  pagination.innerHTML = `
    <button class="button secondary" type="button" data-action="recipe-page" data-page="${recipeBrowser.page - 1}" ${recipeBrowser.page === 0 ? 'disabled' : ''}>Previous</button>
    <span>Page ${recipeBrowser.page + 1} of ${pageCount}</span>
    <button class="button secondary" type="button" data-action="recipe-page" data-page="${recipeBrowser.page + 1}" ${recipeBrowser.page >= pageCount - 1 ? 'disabled' : ''}>Next</button>`;
}

function recipeCard(recipe) {
  return `<article class="recipe-card">
    <div class="recipe-card-top"><span class="meal-slot">${h(recipe.dishType)}</span><span class="recipe-kind">${h(recipe.cuisine)}</span></div>
    <h3>${h(recipe.name)}</h3>
    <p>${h(recipe.region)} · ${h(recipe.mainIngredient)}</p>
    <div class="recipe-card-meta"><span>${recipe.activeTime} min active</span><span>${recipe.totalTime} min total</span><span>${recipe.nutrition.kcal} kcal</span></div>
    <p class="recipe-description">${h(recipe.description)}</p>
    <button class="button secondary" type="button" data-action="view-recipe" data-recipe-id="${h(recipe.id)}">View full recipe</button>
  </article>`;
}

function openRecipe(recipeId) {
  const recipe = RECIPE_MAP[recipeId];
  if (!recipe) return showToast('Recipe details are unavailable.');
  const dialog = document.getElementById('recipeDialog');
  const content = document.getElementById('recipeDialogContent');
  const alternateMethods = recipe.alternateMethods.map((method, index) => `
    <details class="alternate-method">
      <summary>${h(method.label || `Alternate method ${index + 1}`)}</summary>
      <ol class="instruction-list">${(method.instructions || []).map((step) => `<li>${h(step)}</li>`).join('')}</ol>
    </details>`).join('');
  const sourceLinks = recipe.sources
    .filter((source, index, sources) => source.url && sources.findIndex((item) => item.url === source.url) === index)
    .map((source) => `<a href="${h(source.url)}" target="_blank" rel="noopener noreferrer">${h(source.source_name || 'Recipe source')}</a>`)
    .join('');
  content.innerHTML = `
    <div class="recipe-dialog-header">
      <div><p class="eyebrow">${h(recipe.region)} · ${h(recipe.dishType)}</p><h2>${h(recipe.name)}</h2><p>${h(recipe.description)}</p></div>
      <button id="recipeDialogClose" class="icon-button" type="button" aria-label="Close recipe">×</button>
    </div>
    <div class="recipe-summary-grid">
      <div><small>Servings</small><strong>${recipe.servings}</strong></div>
      <div><small>Active time</small><strong>${recipe.activeTime} min</strong></div>
      <div><small>Total time</small><strong>${recipe.totalTime} min</strong></div>
      <div><small>Difficulty</small><strong>${h(recipe.difficulty)}</strong></div>
    </div>
    <div class="recipe-detail-grid">
      <section>
        <h3>Ingredients</h3>
        <ul class="ingredient-list">${recipe.ingredients.map((item) => `<li><span>${h(item.displayText || `${displayQuantity(item.quantity, item.unit)} ${item.name}`)}${item.optional ? ' <small>(optional)</small>' : ''}</span></li>`).join('')}</ul>
      </section>
      <section>
        <h3>Instructions</h3>
        <ol class="instruction-list">${recipe.instructions.map((step) => `<li>${h(step)}</li>`).join('')}</ol>
        ${alternateMethods}
      </section>
    </div>
    <section class="recipe-nutrition">
      <h3>Estimated nutrition per serving</h3>
      <div class="recipe-summary-grid">
        <div><small>Energy</small><strong>${recipe.nutrition.kcal} kcal</strong></div>
        <div><small>Protein</small><strong>${recipe.nutrition.protein} g</strong></div>
        <div><small>Fibre</small><strong>${recipe.nutrition.fibre} g</strong></div>
        <div><small>Iron</small><strong>${recipe.nutrition.iron} mg</strong></div>
      </div>
      <p class="help">Nutrition is an approximate planning estimate. Confidence: ${h(recipe.nutritionConfidence)}.</p>
    </section>`;
  if (sourceLinks) {
    content.insertAdjacentHTML('beforeend', `<section class="recipe-sources"><h3>Recipe sources</h3><div class="source-links">${sourceLinks}</div></section>`);
  }
  const close = () => dialog.close();
  document.getElementById('recipeDialogClose').addEventListener('click', close, { once: true });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function renderMore() {
  document.getElementById('view-more').innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Household settings</p><h2>Manage your household</h2><p>Update profiles, nutrition targets, recipes and personal data.</p></div></div>
    <section class="panel warm-panel">
      <div class="panel-header"><div><h3>Pakistani recipe library</h3><p>Pakistani, Afghan and Pakistani-home-style dishes with complete ingredients and cooking instructions.</p></div><button class="button secondary" type="button" data-action="navigate" data-view="recipes">Browse recipes</button></div>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h3>Person profiles</h3><p>Set portions and nutrition targets for everyone included in the plan.</p></div><button class="button secondary small" type="button" data-action="add-person">Add person</button></div>
      <div class="grid two">${state.people.map((person) => profileCard(person)).join('')}</div>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h3>Data and privacy</h3><p>Download a household backup or clear the information saved in the meal planner.</p></div></div>
      <div class="button-row"><button class="button secondary" type="button" data-action="export-data">Download household backup</button><button class="button danger" type="button" data-action="reset-data">Clear household data</button></div>
    </section>`;
}

function profileCard(person) {
  return `<article class="profile-card" data-person-id="${h(person.id)}"><div class="profile-title"><h3>${h(person.name)}</h3>${state.people.length > 1 ? `<button class="icon-button" type="button" data-action="delete-person" data-person-id="${h(person.id)}" aria-label="Remove ${h(person.name)}">×</button>` : ''}</div><div class="profile-fields"><label>Name<input value="${h(person.name)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="name" /></label><label>Energy target<input type="number" value="${h(person.targetKcal)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="targetKcal" /></label><label>Portion multiplier<input type="number" min="0.25" step="0.05" value="${h(person.portion)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="portion" /></label><label>Protein target (g)<input type="number" value="${h(person.proteinTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="proteinTarget" /></label><label>Fibre target (g)<input type="number" value="${h(person.fibreTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="fibreTarget" /></label><label>Iron target (mg)<input type="number" value="${h(person.ironTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="ironTarget" /></label></div></article>`;
}
