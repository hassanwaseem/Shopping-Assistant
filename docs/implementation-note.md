# Specification implementation note

## September 2026: cooking discovery and slot-safe planning

- The recipe adapter now produces explicit `courseType`, `eligibleMealSlots`, `isCompleteMeal`, and `canBeStandalone` fields.
- Strong dessert and beverage title/category signals override inaccurate imported broad dish types. This fixes imported ice creams that were previously eligible for dinner.
- The weekly plan contains Breakfast, Lunch, Dinner, Dessert, and Tea slots. Dessert and Tea frequency are user-configurable and may remain empty.
- Whole-plan regeneration produces balanced, quick, and pantry-first alternatives without replacing the active plan until one is accepted. The previous plan can be restored immediately.
- Individual swaps show up to ten compatible choices, and the Cook view provides focused recipe discovery and planner insertion.

## September 2026: recommendation integrity repair

- Automatic planning now excludes components, guides, remedies, multi-recipe collections, implausible timing records, and suspect serving yields while keeping every recipe available in search.
- 841 of 4,247 records are currently marked `review-required`; 3,406 remain eligible for automatic recommendations. Every meal slot still has more than 80 safe candidates.
- Ingredient normalization uses the ingredient name rather than recipe-section labels. Pantry coverage uses unique required ingredients, ignores water and optional ingredients, and distinguishes missing from insufficient stock.
- Cook shortcuts are mutually explicit and reversible. Natural-language requests support positive ingredients, exclusions, total and active time, meal intent, and warm/cold drinks without silently changing global planner preferences.
- The three Cook results now use different ranking objectives with cross-result diversity. Cards show the selected destination slot, course type, main ingredients, pantry gaps, difficulty, timing, and leftover suitability.
- Saved recipes are discoverable, recommendation feedback records a reason and can be undone, and “Cook now” provides a checkable cooking view.
- Existing saved weeks roll forward without losing meal choices, suspicious unpinned suggestions are replaced, empty optional slots no longer expose hidden meal controls, and new households start with an empty pantry.

## Baseline reviewed

The detailed Meal Planner and Shared Shopping Assistant specification was treated as the product baseline before implementation.

## Existing repository assessment

The existing repository was a small static browser-only planner with:

- a fixed recipe array,
- calorie-only meal cards,
- checkbox pantry matching by item name,
- non-normalized shopping quantities,
- localStorage persistence,
- URL-fragment pantry sharing.

Those working capabilities were preserved where compatible, but the application structure and data model were replaced with a more explicit household, person, plan, pantry, nutrition, and shopping model.

## Implemented vertical slice

This branch validates the central loop without inventing a backend:

1. Define two or more person profiles and portion multipliers.
2. Generate and edit a seven-day meal plan.
3. Calculate calories, protein, carbohydrate, fat, fibre, iron, calcium, and vitamin C from structured recipes.
4. Record exact or uncertain pantry stock.
5. Normalize and aggregate planned ingredients.
6. Subtract usable exact pantry quantities.
7. Flag uncertain stock for checking instead of subtracting an invented amount.
8. Produce an editable shopping list with source-meal traceability.
9. Preserve manual shopping overrides and additions during recalculation.
10. Cache the application shell for basic PWA resilience.

## Important implementation boundaries

- Recipe composition data in this static branch are curated estimates used to exercise the UI and deterministic calculations. They are not presented as authoritative food-composition records.
- Account sharing, roles, realtime updates, and authorization cannot be implemented safely as static GitHub Pages features. They remain backend milestones.
- Pantry and shopping URL fragments are shareable snapshots, not authenticated collaborative state.
- “Complete shopping” does not automatically mutate pantry quantities yet because purchase reconciliation needs a structured transactional workflow.

## Recommended next milestone

Migrate the static vertical slice to Next.js and Supabase while retaining the pure `planner-engine.js` logic as tested domain code. The first backend milestone should implement:

- authentication,
- household membership,
- two person profiles,
- recipe and ingredient tables,
- pantry CRUD,
- meal-plan entries,
- generated shopping items,
- RLS tests,
- realtime shopping check/uncheck.
