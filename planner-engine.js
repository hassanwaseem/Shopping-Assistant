(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MealPlannerEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MASS_UNITS = { g: 1, kg: 1000 };
  const VOLUME_UNITS = { ml: 1, l: 1000 };

  function round(value, digits = 1) {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function normalizeQuantity(quantity, unit, conversion) {
    const value = Number(quantity);
    if (!Number.isFinite(value) || value < 0) return null;
    if (MASS_UNITS[unit]) return { value: value * MASS_UNITS[unit], unit: 'g', confidence: 'exact' };
    if (VOLUME_UNITS[unit]) return { value: value * VOLUME_UNITS[unit], unit: 'ml', confidence: 'exact' };
    if (conversion && Number.isFinite(conversion.toBase) && conversion.toBase > 0) {
      return { value: value * conversion.toBase, unit: conversion.baseUnit, confidence: conversion.confidence || 'estimated' };
    }
    return { value, unit, confidence: 'unconverted' };
  }

  function scaleIngredient(ingredient, servings, recipeServings) {
    const factor = Number(servings) / Number(recipeServings || 1);
    return {
      ...ingredient,
      quantity: round(Number(ingredient.quantity) * factor, 3),
      sourceQuantity: ingredient.quantity,
      scaleFactor: factor,
    };
  }

  function aggregateIngredients(planEntries, recipeMap) {
    const aggregated = new Map();
    for (const entry of planEntries) {
      const recipe = recipeMap[entry.recipeId];
      if (!recipe || entry.type === 'leftover' || entry.skipped) continue;
      const servings = Number(entry.cookServings || entry.servings || recipe.servings || 1);
      for (const ingredient of recipe.ingredients || []) {
        if (ingredient.optional && entry.omittedIngredients?.includes(ingredient.id)) continue;
        const scaled = scaleIngredient(ingredient, servings, recipe.servings);
        const normalized = normalizeQuantity(scaled.quantity, scaled.unit, scaled.conversion);
        const key = `${ingredient.foodId || ingredient.name.toLowerCase()}::${normalized.unit}`;
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            key,
            foodId: ingredient.foodId || null,
            name: ingredient.name,
            category: ingredient.category || 'Uncategorized',
            gross: 0,
            unit: normalized.unit,
            confidence: normalized.confidence,
            sourceMeals: [],
          });
        }
        const row = aggregated.get(key);
        row.gross += normalized.value;
        if (normalized.confidence !== 'exact') row.confidence = normalized.confidence;
        row.sourceMeals.push({ entryId: entry.id, recipeId: recipe.id, recipeName: recipe.name, day: entry.day, slot: entry.slot });
      }
    }
    return [...aggregated.values()].map((item) => ({ ...item, gross: round(item.gross, 2) }));
  }

  function pantryAvailability(item, pantryItems) {
    const matches = pantryItems.filter((p) => !p.deleted && (p.foodId ? p.foodId === item.foodId : p.name.toLowerCase() === item.name.toLowerCase()));
    let exactAvailable = 0;
    let uncertain = false;
    for (const pantry of matches) {
      if (pantry.mode === 'exact' || pantry.mode === 'count' || pantry.mode === 'package') {
        const normalized = normalizeQuantity(pantry.quantity, pantry.unit, pantry.conversion);
        if (normalized.unit === item.unit) exactAvailable += normalized.value;
        else uncertain = true;
      } else if (pantry.status && pantry.status !== 'out') {
        uncertain = true;
      }
    }
    return { exactAvailable: round(exactAvailable, 2), uncertain, matches };
  }

  function subtractPantry(aggregated, pantryItems) {
    return aggregated.map((item) => {
      const availability = pantryAvailability(item, pantryItems);
      const pantryApplied = Math.min(item.gross, availability.exactAvailable);
      return {
        ...item,
        pantryApplied: round(pantryApplied, 2),
        net: round(Math.max(0, item.gross - pantryApplied), 2),
        checkPantry: availability.uncertain,
        pantryMatches: availability.matches.map((p) => p.id),
      };
    });
  }

  function sumNutrition(entries, recipeMap, personId) {
    const totals = {};
    for (const entry of entries) {
      if (entry.skipped) continue;
      const recipe = recipeMap[entry.recipeId];
      if (!recipe) continue;
      const personServing = personId
        ? Number(entry.people?.[personId] || 0)
        : Object.values(entry.people || {}).reduce((sum, value) => sum + Number(value || 0), 0) || Number(entry.servings || 1);
      const factor = personServing;
      for (const [nutrient, value] of Object.entries(recipe.nutrition || {})) {
        if (value === null || value === undefined) continue;
        totals[nutrient] = (totals[nutrient] || 0) + Number(value) * factor;
      }
    }
    return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value, 1)]));
  }

  function completeness(entries, recipeMap) {
    const recipes = entries.map((entry) => recipeMap[entry.recipeId]).filter(Boolean);
    if (!recipes.length) return { score: 0, status: 'Nutrition unavailable', missing: 0 };
    const scores = recipes.map((recipe) => Number(recipe.completeness ?? 0));
    const score = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    const missing = recipes.filter((recipe) => recipe.completeness < 100).length;
    const status = score >= 90 ? 'High confidence' : score >= 70 ? 'Moderate confidence' : 'Limited data';
    return { score, status, missing };
  }

  function scoreRecipe(recipe, options) {
    if (!recipe) return -Infinity;
    const mode = options.mode || 'balanced';
    const focus = options.focus || 'none';
    const pantryFoodIds = new Set((options.pantryItems || []).map((item) => item.foodId).filter(Boolean));
    let score = 0;
    if (recipe.diets?.includes(options.diet || 'balanced')) score += 20;
    if (mode === 'quick' && recipe.activeTime <= Number(options.maxTime || 30)) score += 25;
    if (mode === 'batch' && recipe.batchFriendly) score += 25;
    if (mode === 'variety' && !options.recentRecipeIds?.includes(recipe.id)) score += 20;
    if (mode === 'pantry') {
      const matching = recipe.ingredients.filter((ingredient) => pantryFoodIds.has(ingredient.foodId)).length;
      score += matching * 7;
    }
    if (focus !== 'none' && recipe.nutrition?.[focus] != null) score += Number(recipe.nutrition[focus]) * Number(options.focusWeight || 1.75);
    score += Math.min(Number(recipe.nutrition?.protein || 0), 35) * 0.25;
    score += Math.min(Number(recipe.nutrition?.fibre || 0), 15) * 0.5;
    score -= Number(recipe.activeTime || 0) * 0.08;
    if (options.recentRecipeIds?.includes(recipe.id)) score -= 12;
    return round(score, 2);
  }

  function chooseRecipe(recipes, options) {
    const eligible = recipes.filter((recipe) => {
      if (recipe.mealType !== options.mealType) return false;
      if (options.diet && options.diet !== 'balanced' && !recipe.diets?.includes(options.diet)) return false;
      if (options.maxTime && options.strictTime && recipe.activeTime > options.maxTime) return false;
      const allergens = new Set(options.allergens || []);
      if ((recipe.allergens || []).some((allergen) => allergens.has(allergen))) return false;
      return true;
    });
    return eligible
      .map((recipe) => ({ recipe, score: scoreRecipe(recipe, options) }))
      .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name))[0] || null;
  }

  return {
    normalizeQuantity,
    aggregateIngredients,
    subtractPantry,
    sumNutrition,
    completeness,
    scoreRecipe,
    chooseRecipe,
    round,
  };
});
