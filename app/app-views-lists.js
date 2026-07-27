'use strict';

  function renderPantry() {
    document.getElementById('view-pantry').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Shared pantry model</p><h2>Record exact amounts or practical uncertainty</h2><p>Exact quantities are subtracted. “Low” and unknown states trigger a check instead of a false deduction.</p></div></div>
      <section class="panel soft-panel">
        <form id="pantryForm" class="pantry-form">
          <label>Item name<input name="name" required placeholder="e.g. Red lentils" /></label>
          <label>Quantity<input name="quantity" inputmode="decimal" type="number" min="0" step="0.1" placeholder="500" /></label>
          <label>Unit<select name="unit">${option('g', 'g', 'g')}${option('ml', 'ml', 'g')}${option('count', 'count', 'g')}</select></label>
          <label>Quantity mode<select name="mode">${option('exact', 'Exact', 'exact')}${option('count', 'Count', 'exact')}${option('status', 'Status only', 'exact')}</select></label>
          <label>Status<select name="status">${option('plenty', 'Plenty', 'enough')}${option('enough', 'Enough', 'enough')}${option('low', 'Low', 'enough')}${option('out', 'Out', 'enough')}</select></label>
          <button class="button" type="submit">Add item</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>Pantry inventory</h3><p>${state.pantry.length} recorded items · local preview</p></div><button class="button secondary small" type="button" data-action="share-pantry">Share pantry</button></div>
        <div class="pantry-list">
          ${state.pantry.map((item) => pantryRow(item)).join('') || '<div class="empty-state">No pantry items yet.</div>'}
        </div>
      </section>`;
  }

  function pantryRow(item) {
    const quantityText = item.mode === 'status' ? 'Quantity not specified' : displayQuantity(item.quantity || 0, item.unit);
    const statusClass = item.status === 'low' ? 'warning' : item.status === 'out' ? 'muted' : '';
    return `<article class="pantry-row">
      <div class="pantry-name"><strong>${h(item.name)}</strong><span>${h(item.storage || 'Cupboard')} · updated locally</span></div>
      <div>${h(quantityText)}</div>
      <span class="status-badge ${statusClass}">${h(item.status || item.mode)}</span>
      <label>Use soon<input type="date" value="${h(item.useSoon || '')}" data-action="update-use-soon" data-pantry-id="${h(item.id)}" /></label>
      <div class="pantry-actions"><button type="button" class="icon-button" data-action="delete-pantry" data-pantry-id="${h(item.id)}" aria-label="Remove ${h(item.name)}">×</button></div>
    </article>`;
  }

  function renderShop() {
    const rows = shoppingRows();
    const filtered = rows.filter((item) => {
      const filter = state.shopping.filter || 'all';
      if (filter === 'unchecked') return !item.checked;
      if (filter === 'check-pantry') return item.checkPantry;
      return true;
    });
    const grouped = Object.groupBy ? Object.groupBy(filtered, (item) => item.category || 'Manual') : filtered.reduce((groups, item) => {
      const key = item.category || 'Manual';
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
    const categories = Object.keys(grouped).sort();
    const remaining = rows.filter((item) => !item.checked && item.state !== 'skipped').length;
    document.getElementById('view-shop').innerHTML = `
      <div class="view-header"><div><p class="eyebrow">Active shopping list</p><h2>Trimmed, traceable and editable</h2><p>Every generated line preserves gross need, pantry deduction and source meals.</p></div><button class="button secondary" type="button" data-action="print">Print list</button></div>
      <section class="panel soft-panel">
        <div class="shopping-toolbar">
          <input id="shoppingSearch" placeholder="Search shopping list" value="${h(state.shopping.search || '')}" />
          <select id="shoppingFilter" aria-label="Shopping list filter">${option('all', 'All items', state.shopping.filter || 'all')}${option('unchecked', 'Unchecked', state.shopping.filter || 'all')}${option('check-pantry', 'Check pantry', state.shopping.filter || 'all')}</select>
          <button class="button" type="button" data-action="share-shopping">Share list</button>
        </div>
        <form id="manualShoppingForm" class="pantry-form">
          <label>Manual item<input name="name" required placeholder="e.g. Dish soap" /></label>
          <label>Quantity<input name="value" inputmode="decimal" type="number" min="0" step="0.1" value="1" /></label>
          <label>Unit<select name="unit">${option('count', 'count', 'count')}${option('g', 'g', 'count')}${option('ml', 'ml', 'count')}</select></label>
          <label>Category<input name="category" value="Household & manual" /></label>
          <span></span><button class="button secondary" type="submit">Add manual item</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>${remaining} items remaining</h3><p>Manual changes are preserved when the list refreshes.</p></div><button class="button secondary small" type="button" data-action="complete-shopping">Complete checked items</button></div>
        <div class="shopping-groups">
          ${categories.map((category) => shoppingCategory(category, grouped[category])).join('') || '<div class="empty-state">The current plan is fully covered by the pantry.</div>'}
        </div>
      </section>`;
  }

  function shoppingCategory(category, items) {
    const search = (state.shopping.search || '').toLowerCase();
    const visible = items.filter((item) => !search || item.name.toLowerCase().includes(search));
    if (!visible.length) return '';
    return `<section class="shopping-category"><h3>${h(category)}<span>${visible.length} items</span></h3>${visible.map((item) => shoppingRow(item)).join('')}</section>`;
  }

  function shoppingRow(item) {
    const sources = item.sourceMeals?.map((source) => source.recipeName).filter((name, index, array) => array.indexOf(name) === index).slice(0, 2) || [];
    const derivation = item.manual
      ? 'Manual household item'
      : `Gross ${displayQuantity(item.gross, item.unit)} − pantry ${displayQuantity(item.pantryApplied, item.unit)}${item.checkPantry ? ' · pantry quantity uncertain' : ''}`;
    return `<article class="shopping-row ${item.checked ? 'checked' : ''}">
      <input class="check-control" type="checkbox" ${item.checked ? 'checked' : ''} data-action="toggle-shopping" data-item-id="${h(item.id)}" aria-label="Check ${h(item.name)}" />
      <div class="shopping-name"><strong>${h(item.name)}${item.manual ? '<span class="manual-badge">manual</span>' : ''}</strong><span>${sources.length ? `For ${h(sources.join(', '))}` : 'Added by household'}</span></div>
      <div class="quantity-editor"><input type="number" min="0" step="0.1" value="${h(item.displayValue)}" data-action="edit-shopping-quantity" data-item-id="${h(item.id)}" data-manual="${item.manual}" aria-label="Quantity for ${h(item.name)}" /><select data-action="edit-shopping-unit" data-item-id="${h(item.id)}" data-manual="${item.manual}" aria-label="Unit for ${h(item.name)}">${option('g', 'g', item.displayUnit)}${option('ml', 'ml', item.displayUnit)}${option('count', 'count', item.displayUnit)}</select></div>
      <select class="shopping-state" data-action="change-shopping-state" data-item-id="${h(item.id)}" aria-label="State for ${h(item.name)}">${option('needed', 'Needed', item.state)}${option('unavailable', 'Unavailable', item.state)}${option('skipped', 'Skipped', item.state)}${option('already-have', 'Already have', item.state)}</select>
      <button type="button" class="icon-button" data-action="remove-shopping" data-item-id="${h(item.id)}" data-manual="${item.manual}" aria-label="Remove ${h(item.name)}">×</button>
      <div class="shopping-derivation">${h(derivation)}${item.manualOverride ? ' · manual override preserved' : ''}</div>
    </article>`;
  }

