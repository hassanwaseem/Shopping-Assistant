(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MealPlannerEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MASS_UNITS = { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
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

  function filterSelectedPlanEntries(planEntries, selectedEntryIds) {
    const selected = new Set(Array.isArray(selectedEntryIds) ? selectedEntryIds : []);
    return (planEntries || []).filter((entry) => selected.has(entry.id));
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
        if (!normalized) continue;
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

  function pantryCoverage(recipe, pantryItems) {
    const ignored = new Set(['water', 'ice', 'ice-cubes']);
    const required = new Map();
    for (const ingredient of recipe?.ingredients || []) {
      if (ingredient.optional || ignored.has(ingredient.foodId)) continue;
      const key = ingredient.foodId || String(ingredient.name || '').toLowerCase();
      if (!key) continue;
      if (!required.has(key)) required.set(key, { ...ingredient, key, quantities: [] });
      required.get(key).quantities.push({ quantity: ingredient.quantity, unit: ingredient.unit, conversion: ingredient.conversion });
    }

    const usablePantry = (pantryItems || []).filter((item) => !item.deleted && item.status !== 'out');
    const matched = [];
    const missing = [];
    const partial = [];
    for (const ingredient of required.values()) {
      const pantryMatches = usablePantry.filter((item) => (
        item.foodId ? item.foodId === ingredient.foodId : String(item.name).toLowerCase() === String(ingredient.name).toLowerCase()
      ));
      if (!pantryMatches.length) {
        missing.push(ingredient.name);
        continue;
      }

      const needed = ingredient.quantities
        .map((item) => normalizeQuantity(item.quantity, item.unit, item.conversion))
        .filter(Boolean);
      const comparableNeeded = needed.length && needed.every((item) => item.unit === needed[0].unit)
        ? needed.reduce((sum, item) => sum + item.value, 0)
        : null;
      const comparableAvailable = pantryMatches
        .map((item) => normalizeQuantity(item.quantity, item.unit, item.conversion))
        .filter((item) => item && (!needed[0] || item.unit === needed[0].unit))
        .reduce((sum, item) => sum + item.value, 0);
      const hasApproximateStock = pantryMatches.some((item) => item.mode === 'status' || item.quantity == null);

      if (comparableNeeded != null && !hasApproximateStock && comparableAvailable < comparableNeeded) {
        partial.push(ingredient.name);
      } else {
        matched.push(ingredient.name);
      }
    }

    const total = required.size;
    const covered = matched.length + partial.length;
    return {
      total,
      matched: matched.length,
      recorded: covered,
      missing: missing.length + partial.length,
      unrecorded: missing,
      partial,
      percent: total ? Math.round((covered / total) * 100) : 0,
    };
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
      const matching = new Set(recipe.ingredients.filter((ingredient) => pantryFoodIds.has(ingredient.foodId)).map((ingredient) => ingredient.foodId)).size;
      score += matching * 7;
    }
    if (focus !== 'none' && recipe.nutrition?.[focus] != null) {
      const reference = { protein: 30, fibre: 10, iron: 8, calcium: 400, vitaminC: 60 }[focus] || 10;
      score += Math.min(30, (Number(recipe.nutrition[focus]) / reference) * 20 * (Number(options.focusWeight || 1.75) / 1.75));
    }
    score += Math.min(Number(recipe.nutrition?.protein || 0), 35) * 0.25;
    score += Math.min(Number(recipe.nutrition?.fibre || 0), 15) * 0.5;
    score -= Number(recipe.activeTime || 0) * 0.08;
    if (options.mealType) {
      const target = { breakfast: 450, lunch: 600, dinner: 650, dessert: 250, tea: 120 }[options.mealType];
      if (target) score -= Math.abs(Number(recipe.nutrition?.kcal || target) - target) / target * 14;
    }
    if (options.recentRecipeIds?.includes(recipe.id)) score -= 12;
    return round(score, 2);
  }

  function isRecipeEligible(recipe, mealType) {
    if (!recipe || !mealType) return false;
    const slots = recipe.eligibleMealSlots || recipe.mealSlots || [];
    if (!(slots.includes(mealType) || recipe.mealType === mealType)) return false;
    if (mealType === 'dessert') return recipe.courseType === 'dessert' || recipe.dishType === 'Desserts';
    if (mealType === 'tea') return ['drink', 'snack'].includes(recipe.courseType) || recipe.dishType === 'Drinks';
    if (mealType === 'breakfast') return recipe.courseType === 'breakfast' || recipe.dishType === 'Breakfast';
    if (mealType === 'lunch' || mealType === 'dinner') {
      const mainCourse = recipe.courseType ? recipe.courseType === 'main' : !['Desserts', 'Drinks', 'Snacks & street food', 'Breads'].includes(recipe.dishType);
      return mainCourse && recipe.isCompleteMeal !== false && recipe.canBeStandalone !== false;
    }
    return true;
  }

  function isRecipeRecommendable(recipe, mealType) {
    if (!isRecipeEligible(recipe, mealType) || recipe.recommendationEligible === false) return false;
    const kcal = Number(recipe.nutrition?.kcal);
    if (!Number.isFinite(kcal) || kcal <= 0) return false;
    const automaticEnergyCeilings = {
      breakfast: 900,
      lunch: 1200,
      dinner: 1200,
      dessert: 700,
      tea: 450,
    };
    return kcal <= (automaticEnergyCeilings[mealType] || Infinity);
  }

  function chooseRecipe(recipes, options) {
    const eligible = recipes.filter((recipe) => {
      if (!isRecipeEligible(recipe, options.mealType)) return false;
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
    filterSelectedPlanEntries,
    aggregateIngredients,
    subtractPantry,
    pantryCoverage,
    sumNutrition,
    completeness,
    scoreRecipe,
    isRecipeEligible,
    isRecipeRecommendable,
    chooseRecipe,
    round,
  };
});
