# Meal Planner

A mobile-first Pakistani household meal planner with a regional recipe library, nutrition estimates, pantry subtraction, and an editable shopping list.

## What is implemented in this branch

- Today dashboard with meals, preparation cues, shopping status, and nutrition summary
- Seven-day editable meal plan
- 501 complete Pakistani and Afghan recipe variants loaded from `data/pakistani-recipes.json`
- Pakistani-focused filtering by region, dish type, main ingredient, dietary pattern, and cooking time
- Balanced, pantry-first, quick-week, batch-cooking, and variety planning modes
- Temporary protein, fibre, iron, calcium, and vitamin C focus
- Meal pinning, swapping, skipping, and household serving adjustment
- Multiple person profiles with different portions and planning targets
- Deterministic daily and weekly nutrition arithmetic
- Visible nutrition completeness; missing nutrient values are not converted to zero
- Pantry items with exact, count, and uncertain status modes
- Per-recipe “Add to shopping list” controls in the weekly plan
- Ingredient aggregation and pantry subtraction only for explicitly selected planned recipes
- Shopping-list provenance: gross requirement, pantry deduction, source meals, and final amount
- Editable shopping quantities, manual items, item states, checks, and suppression
- Manual shopping changes preserved while the plan-derived list refreshes
- Shareable pantry and shopping snapshots using URL fragments
- Installable PWA shell and cached active application files
- Local JSON export
- Responsive desktop and 360–430 px mobile layouts
- Pure calculation module with Node unit tests

## Deliberate limitations

This repository is still a static GitHub Pages application. It does **not** claim to provide the specification’s production backend yet. The following require the planned Next.js/Supabase phase:

- Authentication and household invitations
- Server-enforced roles and Row Level Security
- Realtime multi-user synchronization
- PostgreSQL storage and audit history
- USDA FoodData Central and Open Food Facts mapping
- Versioned EFSA reference-value seed data
- Server-side validation and idempotent transactions
- Durable offline mutation conflict resolution

Recipe nutrition values are clearly treated as planning estimates, not production food-composition truth.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Tests

```bash
npm test
```

The tests cover Pakistani dataset adaptation, filter taxonomy, dietary-tag correction, explicit meal selection for shopping, unit normalization, ingredient aggregation, pantry subtraction, and missing-nutrient semantics.

## Deployment

The current production site is served from `main`. Specification-aligned changes should first be reviewed on a branch or pull request before merging into the stable deployment.
