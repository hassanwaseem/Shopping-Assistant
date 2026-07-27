'use strict';

function filteredRecipes() {
  const query = recipeBrowser.search.trim().toLowerCase();
  return RECIPES.filter((recipe) => {
    if (recipeBrowser.cuisine !== 'all' && recipe.cuisine !== recipeBrowser.cuisine) return false;
    if (recipeBrowser.mealType !== 'all' && recipe.mealType !== recipeBrowser.mealType) return false;
    if (recipeBrowser.diet !== 'all' && !recipe.diets.includes(recipeBrowser.diet)) return false;
    if (!query) return true;
    const haystack = [recipe.name, recipe.cuisine, recipe.region, recipe.category, recipe.description, ...recipe.ingredients.map((item) => item.name)].join(' ').toLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => a.cuisine.localeCompare(b.cuisine) || a.name.localeCompare(b.name));
}

function renderRecipes() {
  const view = document.getElementById('view-recipes');
  if (!view) return;
  const filtered = filteredRecipes();
  const pageCount = Math.max(1, Math.ceil(filtered.length / recipeBrowser.pageSize));
  recipeBrowser.page = Math.min(recipeBrowser.page, pageCount - 1);
  const start = recipeBrowser.page * recipeBrowser.pageSize;
  const visible = filtered.slice(start, start + recipeBrowser.pageSize);
  view.innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Recipe library</p><h2>${RECIPES.length} complete recipes</h2><p>Browse ingredients, instructions, nutrition estimates, cuisines and practical cooking details.</p></div></div>
    <section class="panel soft-panel">
      <div class="recipe-filters">
        <label>Search<input id="recipeSearch" type="search" value="${h(recipeBrowser.search)}" placeholder="Dish, ingredient or region" /></label>
        <label>Cuisine<select data-action="recipe-filter" data-field="cuisine">${option('all', 'All cuisines', recipeBrowser.cuisine)}${CUISINES.map((cuisine) => option(cuisine, cuisine, recipeBrowser.cuisine)).join('')}</select></label>
        <label>Meal type<select data-action="recipe-filter" data-field="mealType">${option('all', 'All meal types', recipeBrowser.mealType)}${option('breakfast', 'Breakfast', recipeBrowser.mealType)}${option('lunch', 'Lunch', recipeBrowser.mealType)}${option('dinner', 'Dinner', recipeBrowser.mealType)}${option('snack', 'Snack', recipeBrowser.mealType)}</select></label>
        <label>Diet<select data-action="recipe-filter" data-field="diet">${option('all', 'All dietary patterns', recipeBrowser.diet)}${option('vegetarian', 'Vegetarian', recipeBrowser.diet)}${option('vegan', 'Vegan', recipeBrowser.diet)}${option('high-protein', 'High protein', recipeBrowser.diet)}</select></label>
      </div>
      <p class="help">${filtered.length} matching recipes · showing ${filtered.length ? start + 1 : 0}–${Math.min(start + recipeBrowser.pageSize, filtered.length)}</p>
    </section>
    <div class="recipe-grid">
      ${visible.map((recipe) => recipeCard(recipe)).join('') || '<div class="empty-state">No recipes match these filters.</div>'}
    </div>
    <div class="pagination" aria-label="Recipe pages">
      <button class="button secondary" type="button" data-action="recipe-page" data-page="${recipeBrowser.page - 1}" ${recipeBrowser.page === 0 ? 'disabled' : ''}>Previous</button>
      <span>Page ${recipeBrowser.page + 1} of ${pageCount}</span>
      <button class="button secondary" type="button" data-action="recipe-page" data-page="${recipeBrowser.page + 1}" ${recipeBrowser.page >= pageCount - 1 ? 'disabled' : ''}>Next</button>
    </div>`;
}

function recipeCard(recipe) {
  const label = recipe.authenticity === 'inspired' ? 'Inspired' : 'Named dish';
  return `<article class="recipe-card">
    <div class="recipe-card-top"><span class="meal-slot">${h(recipe.mealType)}</span><span class="recipe-kind">${h(label)}</span></div>
    <h3>${h(recipe.name)}</h3>
    <p>${h(recipe.cuisine)} · ${h(recipe.region)}</p>
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
  content.innerHTML = `
    <div class="recipe-dialog-header">
      <div><p class="eyebrow">${h(recipe.cuisine)} · ${h(recipe.mealType)}</p><h2>${h(recipe.name)}</h2><p>${h(recipe.description)}</p></div>
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
        <ul class="ingredient-list">${recipe.ingredients.map((item) => `<li><span>${h(item.name)}${item.optional ? ' <small>(optional)</small>' : ''}</span><strong>${h(displayQuantity(item.quantity, item.unit))}</strong></li>`).join('')}</ul>
      </section>
      <section>
        <h3>Instructions</h3>
        <ol class="instruction-list">${recipe.instructions.map((step) => `<li>${h(step)}</li>`).join('')}</ol>
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
      <p class="help">Nutrition is an approximate planning estimate calculated from structured ingredient quantities.</p>
    </section>`;
  const close = () => dialog.close();
  document.getElementById('recipeDialogClose').addEventListener('click', close, { once: true });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function renderMore() {
  document.getElementById('view-more').innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Household and settings</p><h2>Profiles, targets and implementation status</h2><p>Person profiles are separate from account membership, as required by the product model.</p></div></div>
    <section class="panel warm-panel">
      <div class="panel-header"><div><h3>Recipe library</h3><p>${RECIPES.length} complete recipes across ${CUISINES.length} cuisines, with ingredients and cooking instructions.</p></div><button class="button secondary" type="button" data-action="navigate" data-view="recipes">Browse recipes</button></div>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h3>Person profiles</h3><p>Targets are planning defaults and remain editable.</p></div><button class="button secondary small" type="button" data-action="add-person">Add person</button></div>
      <div class="grid two">${state.people.map((person) => profileCard(person)).join('')}</div>
    </section>
    <section class="panel soft-panel">
      <div class="panel-header"><div><h3>What this branch implements</h3><p>A working static vertical slice, not a fabricated production backend.</p></div></div>
      <div class="implementation-list">
        ${implementationItem('500-recipe categorized library with complete instructions', 'Implemented')}
        ${implementationItem('Responsive app shell and mobile navigation', 'Implemented')}
        ${implementationItem('Editable seven-day plan with pin, swap, skip and portions', 'Implemented')}
        ${implementationItem('Daily and weekly nutrition calculations', 'Implemented')}
        ${implementationItem('Exact and uncertain pantry states', 'Implemented')}
        ${implementationItem('Pantry-trimmed shopping list with provenance', 'Implemented')}
        ${implementationItem('PWA shell and offline read/edit resilience', 'Implemented')}
        ${implementationItem('Supabase accounts, roles, realtime and RLS', 'Backend phase')}
        ${implementationItem('USDA/OFF food mapping and EFSA seed data', 'Backend phase')}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h3>Data controls</h3><p>The preview stores data in localStorage.</p></div></div>
      <div class="button-row"><button class="button secondary" type="button" data-action="export-data">Export household JSON</button><button class="button danger" type="button" data-action="reset-data">Reset local data</button></div>
    </section>`;
}

function profileCard(person) {
  return `<article class="profile-card" data-person-id="${h(person.id)}"><div class="profile-title"><h3>${h(person.name)}</h3>${state.people.length > 1 ? `<button class="icon-button" type="button" data-action="delete-person" data-person-id="${h(person.id)}" aria-label="Remove ${h(person.name)}">×</button>` : ''}</div><div class="profile-fields"><label>Name<input value="${h(person.name)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="name" /></label><label>Energy target<input type="number" value="${h(person.targetKcal)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="targetKcal" /></label><label>Portion multiplier<input type="number" min="0.25" step="0.05" value="${h(person.portion)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="portion" /></label><label>Protein target (g)<input type="number" value="${h(person.proteinTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="proteinTarget" /></label><label>Fibre target (g)<input type="number" value="${h(person.fibreTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="fibreTarget" /></label><label>Iron target (mg)<input type="number" value="${h(person.ironTarget)}" data-action="edit-person" data-person-id="${h(person.id)}" data-field="ironTarget" /></label></div></article>`;
}

function implementationItem(label, status) {
  return `<div class="implementation-item"><span>${h(label)}</span><strong>${h(status)}</strong></div>`;
}
