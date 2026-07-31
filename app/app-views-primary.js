'use strict';

function renderNav() {
  const desktop = NAV_ITEMS.map((item) => navButton(item)).join('');
  const mobileOrder = ['today', 'plan', 'shop', 'pantry', 'more'];
  const mobileItems = mobileOrder.map((id) => NAV_ITEMS.find((item) => item.id === id));
  document.getElementById('desktopNav').innerHTML = desktop;
  document.getElementById('mobileNav').innerHTML = mobileItems.map((item) => navButton(item)).join('');
}

function navButton(item) {
  return `<button class="nav-button ${activeView === item.id ? 'active' : ''}" type="button" data-action="navigate" data-view="${h(item.id)}" aria-current="${activeView === item.id ? 'page' : 'false'}"><span class="nav-icon" aria-hidden="true">${h(item.icon)}</span><span>${h(item.label)}</span></button>`;
}

function renderToday() {
  const dates = weekDates();
  const todayIso = isoDate(new Date());
  const index = Math.max(0, dates.findIndex((date) => isoDate(date) === todayIso));
  const entries = planEntriesForDay(index);
  const firstPerson = state.people[0];
  const shopping = shoppingRows();
  const unchecked = shopping.filter((item) => !item.checked && item.state !== 'skipped').length;
  const useSoon = state.pantry.filter((item) => item.useSoon && item.useSoon <= isoDate(new Date(Date.now() + 3 * 86400000))).length;
  const avg = averageDaily(firstPerson.id);

  document.getElementById('view-today').innerHTML = `
    <div class="view-header">
      <div><p class="eyebrow">${h(formatDate(dates[index], { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h2>Today in ${h(state.householdName)}</h2><p>Meals, preparation cues and nutrition at a glance.</p></div>
      <button class="button secondary" type="button" data-action="navigate" data-view="plan">Open weekly plan</button>
    </div>
    <div class="stat-grid">
      <article class="stat-card"><small>Planned meals</small><strong>${entries.filter((entry) => !entry.skipped).length}</strong><span>${entries.some((entry) => entry.pinned) ? 'Includes pinned choices' : 'All editable'}</span></article>
      <article class="stat-card"><small>Shopping remaining</small><strong>${unchecked}</strong><span>${shopping.length ? 'Across the active list' : 'Nothing currently required'}</span></article>
      <article class="stat-card"><small>Pantry use-soon</small><strong>${useSoon}</strong><span>Based on household-entered dates</span></article>
      <article class="stat-card"><small>Average energy</small><strong>${Math.round(avg.kcal || 0)}</strong><span>kcal/day for ${h(firstPerson.name)}</span></article>
    </div>
    <div class="grid two" style="margin-top:18px">
      <section class="panel">
        <div class="panel-header"><div><h3>Meals</h3><p>Portions reflect each person profile.</p></div></div>
        <div class="today-meals">
          ${entries.map((entry) => {
            const recipe = RECIPE_MAP[entry.recipeId];
            const servings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0);
            return `<article class="today-meal"><div class="slot">${h(entry.slot)}</div><div><strong>${h(recipe.name)}</strong><span>${servings.toFixed(1)} household servings · ${recipe.activeTime} min active</span></div><div class="meal-kcal">${recipe.nutrition.kcal} kcal/serving<br><button class="text-button" type="button" data-action="view-recipe" data-recipe-id="${h(recipe.id)}">View recipe</button></div></article>`;
          }).join('') || '<div class="empty-state">No meals planned for this day.</div>'}
        </div>
      </section>
      <section class="panel soft-panel">
        <div class="panel-header"><div><h3>Preparation</h3><p>Practical cues derived from the current recipes.</p></div></div>
        <div class="stack">
          ${entries.map((entry) => {
            const recipe = RECIPE_MAP[entry.recipeId];
            const prep = recipe.batchFriendly ? 'Consider cooking extra for leftovers.' : `Allow about ${recipe.activeTime} minutes of active preparation.`;
            return `<div class="data-quality"><span aria-hidden="true">→</span><div><strong>${h(recipe.name)}</strong><br>${h(prep)}</div></div>`;
          }).join('')}
        </div>
      </section>
    </div>
    <section class="panel warm-panel">
      <div class="panel-header"><div><h3>Current planning priority</h3><p>${state.preferences.focus === 'none' ? 'Balanced planning with no temporary nutrient focus.' : `${h(NUTRIENT_META[state.preferences.focus]?.label || state.preferences.focus)} focus at ${h(state.preferences.focusStrength)} strength.`}</p></div><button class="button secondary small" type="button" data-action="navigate" data-view="nutrition">Review nutrition</button></div>
      <div class="disclaimer">Nutrition values are estimates based on structured recipe quantities and planned portions. They support meal planning and are not medical advice.</div>
    </section>`;
}

function renderPlan() {
  const dates = weekDates();
  const totalMeals = state.plan.filter((entry) => !entry.skipped).length;
  const cookingEvents = state.plan.filter((entry) => !entry.skipped && entry.type !== 'leftover').length;
  const shoppingMeals = selectedShoppingEntries().filter((entry) => !entry.skipped).length;
  document.getElementById('view-plan').innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Pakistani weekly planner</p><h2>Choose meals first, then build your shopping list</h2><p>Suggestions remain editable. Ingredients are added only for the recipes you select.</p></div></div>
    <section class="panel soft-panel">
      <div class="plan-controls">
        <label>Planning mode<select id="planningMode">
          ${option('balanced', 'Balanced', state.preferences.mode)}${option('pantry', 'Use pantry first', state.preferences.mode)}${option('quick', 'Quick week', state.preferences.mode)}${option('batch', 'Batch cooking', state.preferences.mode)}${option('variety', 'High variety', state.preferences.mode)}
        </select></label>
        <label>Dietary pattern<select id="dietMode">${option('balanced', 'Balanced', state.preferences.diet)}${option('vegetarian', 'Vegetarian', state.preferences.diet)}${option('vegan', 'Vegan', state.preferences.diet)}${option('high-protein', 'High protein', state.preferences.diet)}</select></label>
        <label>Regional preference<select id="regionMode">${option('all', 'Any region', state.preferences.region || 'all')}${REGIONS.map((region) => option(region, region, state.preferences.region || 'all')).join('')}</select></label>
        <label>Nutrient focus<select id="nutrientFocus">${option('none', 'No temporary focus', state.preferences.focus)}${option('protein', 'Protein', state.preferences.focus)}${option('fibre', 'Fibre', state.preferences.focus)}${option('iron', 'Iron', state.preferences.focus)}${option('calcium', 'Calcium', state.preferences.focus)}${option('vitaminC', 'Vitamin C', state.preferences.focus)}</select></label>
        <label>Focus strength<select id="focusStrength">${option('gentle', 'Gentle', state.preferences.focusStrength)}${option('moderate', 'Moderate', state.preferences.focusStrength)}${option('strong', 'Strong', state.preferences.focusStrength)}</select></label>
        <button class="button" type="button" data-action="generate-plan">Suggest meals</button>
      </div>
      <p class="help">Generating a new plan clears recipe shopping selections. Manual shopping items remain unchanged.</p>
    </section>
    <div class="week-strip" role="tablist" aria-label="Week days">
      ${dates.map((date, index) => `<button type="button" class="day-tab ${state.selectedPlanDay === index ? 'active' : ''}" data-action="select-day" data-day-index="${index}" role="tab" aria-selected="${state.selectedPlanDay === index}"><span>${h(formatDate(date, { weekday: 'short' }))}</span><strong>${h(formatDate(date, { day: 'numeric' }))}</strong></button>`).join('')}
    </div>
    <section class="plan-grid" id="planGrid" aria-label="Weekly meal plan">
      ${dates.map((date, dayIndex) => `
        <article class="day-column" id="plan-day-${dayIndex}">
          <h3>${h(formatDate(date, { weekday: 'short' }))}<span>${h(formatDate(date, { day: 'numeric', month: 'short' }))}</span></h3>
          ${planEntriesForDay(dayIndex).map((entry) => mealCard(entry)).join('')}
        </article>`).join('')}
    </section>
    <section class="panel" style="margin-top:18px">
      <div class="panel-header"><div><h3>Plan summary</h3><p>Derived from the current editable plan.</p></div></div>
      <div class="stat-grid">
        <article class="stat-card"><small>Planned entries</small><strong>${totalMeals}</strong><span>Across seven days</span></article>
        <article class="stat-card"><small>Cooking events</small><strong>${cookingEvents}</strong><span>Leftovers can reduce this later</span></article>
        <article class="stat-card"><small>Shopping selections</small><strong>${shoppingMeals}</strong><span>Recipes currently contributing ingredients</span></article>
        <article class="stat-card"><small>Nutrition data</small><strong>${engine.completeness(state.plan, RECIPE_MAP).score}%</strong><span>${h(engine.completeness(state.plan, RECIPE_MAP).status)}</span></article>
      </div>
    </section>`;
}

function mealCard(entry) {
  const recipe = RECIPE_MAP[entry.recipeId];
  const totalServings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0);
  const inShoppingList = mealIsInShoppingList(entry.id);
  return `<div class="meal-card ${entry.skipped ? 'muted' : ''}" data-entry-id="${h(entry.id)}">
    <div class="meal-card-header"><span class="meal-slot">${h(entry.slot)}</span><button type="button" class="icon-button ${entry.pinned ? 'active' : ''}" data-action="toggle-pin" data-entry-id="${h(entry.id)}" aria-label="${entry.pinned ? 'Unpin' : 'Pin'} ${h(recipe.name)}">${entry.pinned ? '◆' : '◇'}</button></div>
    <strong class="meal-name">${h(entry.skipped ? 'Meal skipped' : recipe.name)}</strong>
    ${entry.skipped ? '<span class="meal-meta">No ingredients or nutrition allocated</span>' : `<span class="meal-meta">${h(recipe.region)} · ${recipe.activeTime} min active · ${recipe.nutrition.kcal} kcal/serving</span><span class="reason">${h(entry.reason || reasonFor(recipe))}</span>`}
    <div class="portion-control" aria-label="Household serving adjustment">
      <button type="button" data-action="adjust-serving" data-entry-id="${h(entry.id)}" data-delta="-0.25" aria-label="Reduce servings">−</button>
      <span>${totalServings.toFixed(2)} servings</span>
      <button type="button" data-action="adjust-serving" data-entry-id="${h(entry.id)}" data-delta="0.25" aria-label="Increase servings">+</button>
    </div>
    <div class="meal-actions">
      <button class="button secondary small" type="button" data-action="view-recipe" data-recipe-id="${h(recipe.id)}">Recipe</button>
      <button class="button secondary small" type="button" data-action="swap-meal" data-entry-id="${h(entry.id)}">Swap</button>
      <button class="button ghost small" type="button" data-action="toggle-skip" data-entry-id="${h(entry.id)}">${entry.skipped ? 'Restore' : 'Skip'}</button>
    </div>
    ${entry.skipped ? '' : `<button class="button small shopping-select ${inShoppingList ? 'selected' : ''}" type="button" data-action="toggle-meal-shopping" data-entry-id="${h(entry.id)}" aria-pressed="${inShoppingList}">${inShoppingList ? '✓ Added to shopping list' : 'Add to shopping list'}</button>`}
  </div>`;
}

function option(value, label, selected) {
  return `<option value="${h(value)}" ${value === selected ? 'selected' : ''}>${h(label)}</option>`;
}

function renderNutrition() {
  const person = state.people.find((item) => item.id === activeNutritionPerson) || state.people[0];
  const average = averageDaily(person.id);
  const tracked = ['kcal', 'protein', 'fibre', 'iron', 'calcium', 'vitaminC'];
  const quality = engine.completeness(state.plan, RECIPE_MAP);
  const dates = weekDates();
  document.getElementById('view-nutrition').innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Nutrition dashboard</p><h2>Daily detail, weekly context</h2><p>Weekly averages reduce the pressure of interpreting one imperfect day in isolation.</p></div></div>
    <section class="panel">
      <div class="nutrient-tabs" role="tablist" aria-label="Person profiles">
        ${state.people.map((item) => `<button type="button" class="pill-button ${item.id === person.id ? 'active' : ''}" data-action="select-nutrition-person" data-person-id="${h(item.id)}" role="tab" aria-selected="${item.id === person.id}">${h(item.name)}</button>`).join('')}
      </div>
      <div class="nutrient-list">
        ${tracked.map((nutrient) => nutrientRow(nutrient, average[nutrient], targetFor(person, nutrient))).join('')}
      </div>
    </section>
    <div class="grid two" style="margin-top:18px">
      <section class="panel">
        <div class="panel-header"><div><h3>Seven-day detail</h3><p>Planned intake per day for ${h(person.name)}.</p></div></div>
        <div style="overflow-x:auto"><table class="daily-table"><thead><tr><th>Day</th><th>Energy</th><th>Protein</th><th>Fibre</th><th>Iron</th></tr></thead><tbody>
          ${dates.map((date, index) => {
            const totals = dailyTotals(person.id, index);
            return `<tr><td>${h(formatDate(date, { weekday: 'short' }))}</td><td>${Math.round(totals.kcal || 0)} kcal</td><td>${engine.round(totals.protein || 0, 1)} g</td><td>${engine.round(totals.fibre || 0, 1)} g</td><td>${engine.round(totals.iron || 0, 1)} mg</td></tr>`;
          }).join('')}
        </tbody></table></div>
      </section>
      <section class="panel soft-panel">
        <div class="panel-header"><div><h3>Data quality</h3><p>Missing values are not treated as zero.</p></div></div>
        <div class="data-quality"><span aria-hidden="true">◎</span><div><strong>${h(quality.status)} · ${quality.score}%</strong><br>${quality.missing} planned recipe entries use partially complete estimates.</div></div>
        <div class="disclaimer" style="margin-top:14px">Nutrition values are estimates based on food-composition records, ingredient quantities, and planned portions. This tool supports meal planning and is not medical advice.</div>
        <div class="button-row"><button class="button secondary" type="button" data-action="navigate" data-view="more">Edit person targets</button></div>
      </section>
    </div>`;
}

function nutrientRow(nutrient, actual = 0, target = 0) {
  const meta = NUTRIENT_META[nutrient];
  const percent = target ? Math.round((actual / target) * 100) : null;
  const width = percent == null ? 0 : Math.min(percent, 130);
  const statusClass = percent == null ? 'low' : percent < 70 ? 'low' : percent < 90 ? 'near' : '';
  const status = percent == null ? 'Target not configured' : percent < 70 ? 'Below planning target' : percent < 90 ? 'Near target' : percent <= 120 ? 'Within planning range' : 'Above planning target';
  return `<div class="nutrient-row"><div class="nutrient-label"><strong>${h(meta.label)}</strong><span>${h(status)}</span></div><div class="progress-track" aria-label="${h(meta.label)} ${percent ?? 0}% of target"><div class="progress-fill ${statusClass}" style="width:${width}%"></div></div><div class="nutrient-value"><strong>${Number(actual).toFixed(meta.decimals)}</strong> / ${target || '—'} ${h(meta.unit)}</div></div>`;
}
