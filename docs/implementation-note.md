# Specification implementation note

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
