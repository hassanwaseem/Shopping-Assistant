'use strict';

function renderAll() {
  renderNav();
  renderToday();
  renderCook();
  renderPlan();
  renderRecipes();
  renderNutrition();
  renderPantry();
  renderShop();
  renderMore();
  document.querySelectorAll('.app-view').forEach((view) => { view.hidden = view.dataset.view !== activeView; });
}

function navigate(view) {
  activeView = view;
  renderAll();
  document.getElementById(`view-${view}`)?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function findEntry(id) {
  return state.plan.find((entry) => entry.id === id);
}

function swapMeal(id) {
  const entry = findEntry(id);
  if (!entry) return;
  swapContextId = id;
  const current = RECIPE_MAP[entry.recipeId];
  const candidates = rankedRecipes(entry.slot, [entry.recipeId])
    .filter((item) => item.recipe.id !== entry.recipeId)
    .map((item) => ({ ...item, match: pantryMatch(item.recipe) }));
  const selected = [];
  const used = new Set();
  const add = (label, items) => {
    const choice = items.find((item) => !used.has(item.recipe.id));
    if (!choice) return;
    used.add(choice.recipe.id);
    selected.push({ ...choice, label });
  };
  const hasPantry = state.pantry.some((item) => item.status !== 'out');
  add('Best overall match', candidates);
  add('Similar but quicker', [...candidates].filter((item) => item.recipe.activeTime < current.activeTime).sort((a, b) => a.recipe.activeTime - b.recipe.activeTime));
  if (hasPantry && candidates.some((item) => item.match.percent > 0)) {
    add('Uses more pantry ingredients', [...candidates].filter((item) => item.match.percent > 0).sort((a, b) => b.match.percent - a.match.percent || a.match.missing - b.match.missing));
  }
  add('Fewer missing ingredients', [...candidates].sort((a, b) => a.match.missing - b.match.missing || b.score - a.score));
  add('Different region', candidates.filter((item) => item.recipe.region !== current.region));
  add('Different main ingredient', candidates.filter((item) => item.recipe.mainIngredient !== current.mainIngredient));
  for (const item of candidates) {
    if (selected.length >= 10) break;
    if (!used.has(item.recipe.id)) {
      used.add(item.recipe.id);
      selected.push({ ...item, label: 'More variety' });
    }
  }
  swapOptions = selected;
  if (!swapOptions.length) return showToast(`No compatible ${SLOT_LABELS[entry.slot].toLowerCase()} alternative is available.`);
  renderSwapDialog();
}

function applySwap(recipeId) {
  const entry = findEntry(swapContextId);
  const next = RECIPE_MAP[recipeId];
  if (!entry || !next || !engine.isRecipeEligible(next, entry.slot)) return showToast('That recipe is not compatible with this meal slot.');
  entry.recipeId = next.id;
  entry.reason = reasonFor(next);
  entry.pinned = false;
  entry.skipped = false;
  audit('meal_swapped', `${entry.day} ${entry.slot} changed to ${next.name}`);
  saveState('Meal swapped');
  document.getElementById('swapDialog')?.close();
  renderAll();
}

function pantryMatch(recipe) {
  return engine.pantryCoverage(recipe, state.pantry);
}

function renderSwapDialog() {
  const entry = findEntry(swapContextId);
  if (!entry) return;
  const dialog = document.getElementById('swapDialog');
  document.getElementById('swapDialogContent').innerHTML = `
    <div class="dialog-heading"><div><p class="eyebrow">Swap ${h(SLOT_LABELS[entry.slot])}</p><h2>Choose an alternative</h2><p>All options fit this meal slot and your current dietary settings.</p></div><button class="icon-button" type="button" data-action="close-swap" aria-label="Close alternatives">×</button></div>
    <div class="swap-list">${swapOptions.map(({ recipe, match, label }) => {
      return `<article class="swap-option"><div><span class="recommendation-label">${h(label)}</span><h3>${h(recipe.name)}</h3><p>${h(recipe.region)} · ${recipe.activeTime} min active · ${match.percent}% pantry coverage · ${match.missing} still needed</p></div><div class="button-row"><button class="button secondary small" type="button" data-action="view-recipe" data-recipe-id="${h(recipe.id)}">Recipe</button><button class="button small" type="button" data-action="apply-swap" data-recipe-id="${h(recipe.id)}">Choose</button></div></article>`;
    }).join('')}</div>
    <div class="button-row end"><button class="button secondary" type="button" data-action="more-swap-options" data-slot="${h(entry.slot)}">More options</button></div>`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function planStats(plan) {
  const active = plan.filter((entry) => !entry.skipped);
  const recipes = active.map((entry) => RECIPE_MAP[entry.recipeId]).filter(Boolean);
  const averageTime = recipes.length ? Math.round(recipes.reduce((sum, recipe) => sum + recipe.activeTime, 0) / recipes.length) : 0;
  const pantry = recipes.map(pantryMatch);
  const missingIngredients = new Set(pantry.flatMap((item) => [...item.unrecorded, ...item.partial]));
  return {
    meals: active.length,
    averageTime,
    pantryPercent: pantry.length ? Math.round(pantry.reduce((sum, item) => sum + item.percent, 0) / pantry.length) : 0,
    missing: missingIngredients.size,
    desserts: active.filter((entry) => entry.slot === 'dessert').length,
    teas: active.filter((entry) => entry.slot === 'tea').length,
  };
}

function preparePlanAlternatives() {
  const preservePinned = document.getElementById('preservePinned')?.checked !== false;
  const dessertCount = Number(document.getElementById('dessertCount')?.value ?? state.preferences.dessertCount);
  const teaCount = Number(document.getElementById('teaCount')?.value ?? state.preferences.teaCount);
  state.preferences.dessertCount = dessertCount;
  state.preferences.teaCount = teaCount;
  state.preferences.preservePinned = preservePinned;
  planPreviewIndex = null;
  const hasPantry = state.pantry.some((item) => item.status !== 'out');
  const definitions = [
    { key: 'balanced', title: 'Best balanced plan', description: 'Balances variety, nutrition and preparation effort.', overrides: {} },
    { key: 'quick', title: 'Quickest and easiest plan', description: `Keeps active cooking within ${state.preferences.maxTime} minutes where compatible recipes exist.`, overrides: { strictTime: true } },
    hasPantry
      ? { key: 'pantry', title: 'Best pantry plan', description: 'Prioritizes ingredients already recorded at home.', overrides: {} }
      : { key: 'variety', title: 'High-variety plan', description: 'Offers a different mix of regions, proteins and cooking methods.', overrides: {} },
  ];
  planAlternatives = [];
  definitions.forEach((definition, index) => {
    let bestPlan = null;
    let lowestOverlap = Infinity;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const plan = buildPlanVariant({ preservePinned, mode: definition.key, dessertCount, teaCount, offset: index * 11 + attempt * 7 + 1, preferenceOverrides: definition.overrides });
      const activeIds = new Set(plan.filter((entry) => !entry.skipped).map((entry) => entry.recipeId));
      const overlap = planAlternatives.reduce((sum, previous) => sum + previous.plan.filter((entry) => !entry.skipped && activeIds.has(entry.recipeId)).length, 0);
      if (overlap < lowestOverlap) { bestPlan = plan; lowestOverlap = overlap; }
    }
    planAlternatives.push({ ...definition, plan: bestPlan, stats: planStats(bestPlan) });
  });
  renderPlanAlternativesDialog();
}

function renderPlanAlternativesDialog() {
  const dialog = document.getElementById('planAlternativesDialog');
  document.getElementById('planAlternativesContent').innerHTML = `
    <div class="dialog-heading"><div><p class="eyebrow">Whole-week alternatives</p><h2>Choose a direction</h2><p>Your current plan will remain unchanged until you accept a preview.</p></div><button class="icon-button" type="button" data-action="close-plan-alternatives" aria-label="Close alternatives">×</button></div>
    <div class="alternative-grid">${planAlternatives.map((alternative, index) => `<article class="alternative-card"><span class="recommendation-label">Option ${index + 1}</span><h3>${h(alternative.title)}</h3><p>${h(alternative.description)}</p><dl><div><dt>Planned entries</dt><dd>${alternative.stats.meals}</dd></div><div><dt>Average active time</dt><dd>${alternative.stats.averageTime} min</dd></div><div><dt>Pantry match</dt><dd>${alternative.stats.pantryPercent}%</dd></div><div><dt>Missing ingredients</dt><dd>${alternative.stats.missing}</dd></div><div><dt>Desserts</dt><dd>${alternative.stats.desserts}</dd></div><div><dt>Tea/drinks</dt><dd>${alternative.stats.teas}</dd></div></dl><button class="button" type="button" data-action="preview-plan-alternative" data-index="${index}">Preview this plan</button></article>`).join('')}</div>`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function previewPlanAlternative(index) {
  if (!planAlternatives[index]) return;
  planPreviewIndex = index;
  document.getElementById('planAlternativesDialog')?.close();
  renderAll();
  document.getElementById('planGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function acceptPlanAlternative() {
  const alternative = planAlternatives[planPreviewIndex];
  if (!alternative) return;
  const confirmed = await confirmAction('Replace the selected weekly plan?', 'The previewed meals will replace the current plan. You can undo this change immediately afterwards.', 'Use this plan');
  if (!confirmed) return;
  undoPlanSnapshot = { plan: structuredClone(state.plan), selectedEntryIds: [...state.shopping.selectedEntryIds] };
  state.plan = structuredClone(alternative.plan);
  state.shopping.selectedEntryIds = [];
  state.generationCount = Number(state.generationCount || 0) + 1;
  planPreviewIndex = null;
  audit('whole_plan_replaced', alternative.title);
  saveState('Alternative plan applied');
  renderAll();
  showToast('Weekly plan replaced. Undo is available above the planner.');
}

function undoFullPlan() {
  if (!undoPlanSnapshot) return;
  state.plan = undoPlanSnapshot.plan;
  state.shopping.selectedEntryIds = undoPlanSnapshot.selectedEntryIds;
  undoPlanSnapshot = null;
  audit('whole_plan_undo', 'Previous weekly plan restored');
  saveState('Previous plan restored');
  renderAll();
  showToast('Previous weekly plan restored.');
}

function cancelPlanPreview() {
  planPreviewIndex = null;
  renderAll();
}

function addRecipeToPlan(recipeId, dayIndex, slot) {
  const recipe = RECIPE_MAP[recipeId];
  if (!recipe || !engine.isRecipeEligible(recipe, slot)) return showToast(`This recipe is not suitable for ${SLOT_LABELS[slot].toLowerCase()}.`);
  const entry = state.plan.find((item) => item.dayIndex === Number(dayIndex) && item.slot === slot);
  if (!entry) return showToast('That planner slot is unavailable.');
  entry.recipeId = recipe.id;
  entry.skipped = false;
  entry.pinned = false;
  entry.reason = 'Chosen from What should we cook?';
  saveState('Recipe added to plan');
  document.getElementById('addToPlanDialog')?.close();
  renderAll();
  showToast(`${recipe.name} added to ${SLOT_LABELS[slot]}.`);
}

function adjustServing(id, delta) {
  const entry = findEntry(id);
  if (!entry) return;
  const people = state.people;
  const perPersonDelta = Number(delta) / Math.max(people.length, 1);
  for (const person of people) entry.people[person.id] = Math.max(0, engine.round(Number(entry.people[person.id] || 0) + perPersonDelta, 2));
  entry.cookServings = engine.round(Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0), 2);
  saveState('Portions updated');
  renderAll();
}

function mealIsInShoppingList(id) {
  return state.shopping.selectedEntryIds.includes(id);
}

function toggleMealShopping(id) {
  const entry = findEntry(id);
  if (!entry || entry.skipped) return;
  const selected = new Set(state.shopping.selectedEntryIds);
  const recipe = RECIPE_MAP[entry.recipeId];
  if (selected.has(id)) {
    selected.delete(id);
    audit('meal_removed_from_shopping', `${entry.day} ${entry.slot}: ${recipe.name}`);
    showToast(`${recipe.name} removed from the shopping list.`);
  } else {
    selected.add(id);
    audit('meal_added_to_shopping', `${entry.day} ${entry.slot}: ${recipe.name}`);
    showToast(`${recipe.name} added to the shopping list.`);
  }
  state.shopping.selectedEntryIds = [...selected];
  saveState('Shopping selection updated');
  renderAll();
}

function addPantry(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const mode = String(data.get('mode'));
  const quantityRaw = Number(data.get('quantity'));
  state.pantry.push({
    id: uid('pantry'), foodId: null, name, mode,
    quantity: mode === 'status' || !Number.isFinite(quantityRaw) ? null : quantityRaw,
    unit: String(data.get('unit')), status: String(data.get('status')), storage: 'Cupboard', useSoon: null,
  });
  audit('pantry_item_added', name);
  saveState('Pantry item added');
  form.reset();
  renderAll();
}

function addManualShopping(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  state.shopping.manualItems.push({ id: uid('manual'), name, value: Number(data.get('value')) || 1, unit: String(data.get('unit')), category: String(data.get('category') || 'Household & manual') });
  audit('shopping_manual_added', name);
  saveState('Shopping item added');
  form.reset();
  renderAll();
}

function sharePayload(type) {
  if (type === 'pantry') return { type: 'pantry', version: 1, items: state.pantry.map(({ id, foodId, name, mode, quantity, unit, status, storage, useSoon }) => ({ id, foodId, name, mode, quantity, unit, status, storage, useSoon })) };
  return { type: 'shopping', version: 1, items: shoppingRows().map((item) => ({ name: item.name, quantity: item.displayValue, unit: item.displayUnit, checked: item.checked, state: item.state })) };
}

function formatSharedQuantity(value, unit) {
  const numeric = Number(value) || 0;
  if (unit === 'as needed') return 'as needed';
  const rounded = unit === 'g' || unit === 'ml' ? Math.round(numeric / 5) * 5 : Math.round(numeric * 10) / 10;
  if (unit === 'g' && rounded >= 1000) return `${Math.round((rounded / 1000) * 100) / 100} kg`;
  if (unit === 'ml' && rounded >= 1000) return `${Math.round((rounded / 1000) * 100) / 100} l`;
  if (unit === 'count') return `${rounded} ${rounded === 1 ? 'item' : 'items'}`;
  return `${rounded} ${unit}`;
}

function filterShareRows(rows) {
  return rows
    .filter((item) => !item.checked)
    .filter((item) => item.state !== 'skipped' && item.state !== 'already-have')
    .sort((a, b) => {
      const categoryOrder = String(a.category || 'Other').localeCompare(String(b.category || 'Other'));
      return categoryOrder || a.name.localeCompare(b.name);
    });
}

function shareableShoppingRows() {
  return filterShareRows(shoppingRows());
}

function buildShoppingShareTextFromRows(rows, householdName) {
  const shareRows = filterShareRows(rows);
  const lines = [`${householdName} shopping list`];
  if (!shareRows.length) return `${lines[0]}\n\nNothing is currently needed.`;

  lines.push(`${shareRows.length} item${shareRows.length === 1 ? '' : 's'} needed`);
  let currentCategory = '';
  for (const item of shareRows) {
    const category = item.category || 'Other';
    if (category !== currentCategory) {
      currentCategory = category;
      lines.push('', category);
    }
    const flags = [];
    if (item.checkPantry) flags.push('check pantry');
    if (item.state === 'unavailable') flags.push('unavailable');
    const suffix = flags.length ? ` (${flags.join(', ')})` : '';
    lines.push(`• ${item.name} — ${formatSharedQuantity(item.displayValue, item.displayUnit)}${suffix}`);
  }
  return lines.join('\n');
}

function buildShoppingShareText() {
  return buildShoppingShareTextFromRows(shareableShoppingRows(), state.householdName);
}

async function copyShareText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy command failed');
}

async function shareData() {
  const title = `${state.householdName} shopping list`;
  const text = buildShoppingShareText();
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      showToast('Share sheet opened with the needed-items list.');
    } else {
      await copyShareText(text);
      showToast('Needed-items list copied.');
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Sharing was not available.');
  }
}

function importSharedData() {
  if (!location.hash.startsWith('#share=')) return;
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(7)))));
    if (payload.type === 'pantry' && Array.isArray(payload.items)) {
      state.pantry = payload.items.map((item) => ({ ...item, id: uid('pantry') }));
      audit('pantry_imported', `${payload.items.length} items imported from a shared link`);
      saveState('Shared pantry imported');
      history.replaceState(null, '', location.pathname);
      showToast('Shared pantry imported into this browser.');
    }
  } catch {
    showToast('The shared link could not be read.');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

function confirmAction(title, body, confirmLabel = 'Confirm') {
  const dialog = document.getElementById('confirmDialog');
  document.getElementById('dialogTitle').textContent = title;
  document.getElementById('dialogBody').textContent = body;
  document.getElementById('dialogConfirm').textContent = confirmLabel;
  if (typeof dialog.showModal !== 'function') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  if (dialog.open) dialog.close();
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => { pendingConfirmResolve = resolve; });
}

function closeConfirmation(confirmed) {
  const dialog = document.getElementById('confirmDialog');
  if (dialog.open) dialog.close(confirmed ? 'confirm' : 'cancel');
  const resolve = pendingConfirmResolve;
  pendingConfirmResolve = null;
  if (resolve) resolve(Boolean(confirmed));
}

async function completeShopping() {
  const checkedRows = shoppingRows().filter((item) => item.checked);
  if (!checkedRows.length) return showToast('No checked items to complete.');
  const confirmed = await confirmAction('Complete checked items?', 'Checked generated items will remain recorded as completed. Manual checked items will be removed from the active list.', 'Complete');
  if (!confirmed) return;
  const manualIds = new Set(checkedRows.filter((item) => item.manual).map((item) => item.id));
  state.shopping.manualItems = state.shopping.manualItems.filter((item) => !manualIds.has(item.id));
  audit('shopping_completed', `${checkedRows.length} checked items completed`);
  saveState('Shopping updated');
  renderAll();
  showToast('Checked items completed. Pantry purchase reconciliation is reserved for the backend phase.');
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `meal-planner-${state.weekStart}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function updateOnlineState() {
  document.getElementById('offlineBanner').hidden = navigator.onLine;
}

if (typeof module !== 'undefined') module.exports = { formatSharedQuantity, filterShareRows, buildShoppingShareTextFromRows };
