'use strict';

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'navigate') return navigate(target.dataset.view);
  if (action === 'generate-plan') {
    state.preferences.mode = document.getElementById('planningMode').value;
    state.preferences.diet = document.getElementById('dietMode').value;
    state.preferences.region = document.getElementById('regionMode').value;
    state.preferences.focus = document.getElementById('nutrientFocus').value;
    state.preferences.focusStrength = document.getElementById('focusStrength').value;
    return generatePlan({ preservePinned: true });
  }
  if (action === 'select-day') {
    state.selectedPlanDay = Number(target.dataset.dayIndex);
    saveState();
    renderAll();
    document.getElementById(`plan-day-${state.selectedPlanDay}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    return;
  }
  if (action === 'toggle-pin') {
    const entry = findEntry(target.dataset.entryId);
    if (entry) entry.pinned = !entry.pinned;
    saveState('Pin updated');
    return renderAll();
  }
  if (action === 'view-recipe') return openRecipe(target.dataset.recipeId);
  if (action === 'recipe-page') { recipeBrowser.page = Math.max(0, Number(target.dataset.page) || 0); return renderRecipes(); }
  if (action === 'swap-meal') return swapMeal(target.dataset.entryId);
  if (action === 'adjust-serving') return adjustServing(target.dataset.entryId, Number(target.dataset.delta));
  if (action === 'toggle-meal-shopping') return toggleMealShopping(target.dataset.entryId);
  if (action === 'toggle-skip') {
    const entry = findEntry(target.dataset.entryId);
    if (entry) entry.skipped = !entry.skipped;
    saveState('Meal status updated');
    return renderAll();
  }
  if (action === 'select-nutrition-person') { activeNutritionPerson = target.dataset.personId; return renderAll(); }
  if (action === 'delete-pantry') {
    const item = state.pantry.find((row) => row.id === target.dataset.pantryId);
    const confirmed = await confirmAction('Remove pantry item?', `Remove ${item?.name || 'this item'} from the pantry?`, 'Remove');
    if (!confirmed) return;
    state.pantry = state.pantry.filter((row) => row.id !== target.dataset.pantryId);
    saveState('Pantry item removed');
    return renderAll();
  }
  if (action === 'share-pantry') return shareData('pantry');
  if (action === 'share-shopping') return shareData('shopping');
  if (action === 'print') return window.print();
  if (action === 'remove-shopping') {
    const id = target.dataset.itemId;
    if (target.dataset.manual === 'true') state.shopping.manualItems = state.shopping.manualItems.filter((item) => item.id !== id);
    else state.shopping.suppressed = [...new Set([...state.shopping.suppressed, id])];
    state.shopping.checked = state.shopping.checked.filter((itemId) => itemId !== id);
    saveState('Shopping item removed');
    return renderAll();
  }
  if (action === 'complete-shopping') return completeShopping();
  if (action === 'add-person') {
    const id = uid('person');
    state.people.push({ id, name: `Person ${state.people.length + 1}`, targetKcal: 2000, proteinTarget: 80, fibreTarget: 28, ironTarget: 11, calciumTarget: 950, vitaminCTarget: 95, portion: 1 });
    activeNutritionPerson = id;
    saveState('Person added');
    return generatePlan({ preservePinned: true });
  }
  if (action === 'delete-person') {
    const person = state.people.find((item) => item.id === target.dataset.personId);
    const confirmed = await confirmAction('Remove person profile?', `Remove ${person?.name || 'this profile'} from planning?`, 'Remove');
    if (!confirmed) return;
    state.people = state.people.filter((item) => item.id !== target.dataset.personId);
    state.plan.forEach((entry) => { delete entry.people[target.dataset.personId]; entry.cookServings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0); });
    activeNutritionPerson = state.people[0].id;
    saveState('Person removed');
    return renderAll();
  }
  if (action === 'export-data') return exportData();
  if (action === 'reset-data') {
    const confirmed = await confirmAction('Reset local meal planner?', 'This removes the local plan, pantry, profiles and shopping edits from this browser.', 'Reset');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    generatePlan({ preservePinned: false });
    return;
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action === 'recipe-filter') {
    recipeBrowser[target.dataset.field] = target.value;
    recipeBrowser.page = 0;
    return renderRecipes();
  }
  if (action === 'update-use-soon') {
    const item = state.pantry.find((row) => row.id === target.dataset.pantryId);
    if (item) item.useSoon = target.value || null;
    saveState('Pantry date updated');
    return;
  }
  if (action === 'toggle-shopping') {
    const id = target.dataset.itemId;
    state.shopping.checked = target.checked ? [...new Set([...state.shopping.checked, id])] : state.shopping.checked.filter((itemId) => itemId !== id);
    saveState('Shopping item updated');
    return renderAll();
  }
  if (action === 'edit-shopping-quantity' || action === 'edit-shopping-unit') {
    const id = target.dataset.itemId;
    const row = shoppingRows().find((item) => item.id === id);
    if (!row) return;
    const container = target.closest('.quantity-editor');
    const value = Number(container.querySelector('input').value) || 0;
    const unit = container.querySelector('select').value;
    if (target.dataset.manual === 'true') {
      const manual = state.shopping.manualItems.find((item) => item.id === id);
      if (manual) { manual.value = value; manual.unit = unit; }
    } else state.shopping.overrides[id] = { value, unit };
    saveState('Shopping quantity updated');
    return renderAll();
  }
  if (action === 'change-shopping-state') {
    state.shopping.states[target.dataset.itemId] = target.value;
    saveState('Shopping state updated');
    return renderAll();
  }
  if (action === 'edit-person') {
    const person = state.people.find((item) => item.id === target.dataset.personId);
    if (!person) return;
    const field = target.dataset.field;
    person[field] = field === 'name' ? target.value.trim() || person.name : Number(target.value);
    if (field === 'portion') state.plan.forEach((entry) => { entry.people[person.id] = person.portion; entry.cookServings = Object.values(entry.people).reduce((sum, value) => sum + Number(value), 0); });
    saveState('Profile updated');
    return renderAll();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'recipeSearch') {
    recipeBrowser.search = event.target.value;
    recipeBrowser.page = 0;
    renderRecipes();
    return;
  }
  if (event.target.id === 'shoppingSearch') {
    state.shopping.search = event.target.value;
    saveState();
  }
});

document.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'pantryForm') addPantry(event.target);
  if (event.target.id === 'manualShoppingForm') addManualShopping(event.target);
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'recipeSearch') {
    recipeBrowser.search = event.target.value;
    recipeBrowser.page = 0;
    renderRecipes();
    return;
  }
  if (event.target.id === 'shoppingSearch') {
    state.shopping.search = event.target.value;
    saveState();
    renderShop();
    return;
  }
  if (event.target.id === 'shoppingFilter') {
    state.shopping.filter = event.target.value;
    saveState();
    renderShop();
  }
});

document.getElementById('dialogCancel').addEventListener('click', () => closeConfirmation(false));
document.getElementById('dialogConfirm').addEventListener('click', () => closeConfirmation(true));
document.getElementById('confirmDialog').addEventListener('cancel', (event) => { event.preventDefault(); closeConfirmation(false); });
document.getElementById('recipeDialog').addEventListener('cancel', (event) => { event.preventDefault(); event.currentTarget.close(); });
document.getElementById('shareHouseholdBtn').addEventListener('click', () => shareData('pantry'));
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});

async function boot() {
  try {
    const recipes = await window.PakistaniRecipeAdapter.load('./data/pakistani-recipes.json');
    installRecipes(recipes);
    importSharedData();
    ensurePlan();
    updateOnlineState();
    renderAll();
  } catch (error) {
    console.error(error);
    document.getElementById('view-today').innerHTML = `
      <div class="empty-state recipe-load-error">
        <h2>Recipes could not be loaded</h2>
        <p>Please refresh the page. Your saved household information has not been changed.</p>
      </div>`;
  }
}

boot();
