'use strict';

function renderAll() {
  renderNav();
  renderToday();
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
  const ranked = rankedRecipes(entry.slot, [entry.recipeId]);
  const currentIndex = ranked.findIndex((item) => item.recipe.id === entry.recipeId);
  const next = ranked[(currentIndex + 1 + ranked.length) % ranked.length] || ranked.find((item) => item.recipe.id !== entry.recipeId);
  if (!next) return showToast('No compatible alternative is available.');
  entry.recipeId = next.recipe.id;
  entry.reason = reasonFor(next.recipe);
  entry.pinned = false;
  audit('meal_swapped', `${entry.day} ${entry.slot} changed to ${next.recipe.name}`);
  saveState('Meal swapped');
  renderAll();
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
