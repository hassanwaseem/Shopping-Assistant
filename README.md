# Meal Planner

A mobile-first household meal-planning vertical slice based on the detailed product, UX, nutrition, pantry, shopping, and architecture specification.

## What is implemented in this branch

- Today dashboard with meals, preparation cues, shopping status, and nutrition summary
- Seven-day editable meal plan with recipe-history diversity penalties
- Browseable library of 500 complete recipes across 40 cuisines
- Full frontend recipe details with ingredients, instructions, timings, and nutrition estimates
- 123 named dishes and 377 clearly identified cuisine-inspired recipes
- Full frontend recipe details: ingredients, servings, instructions, time and nutrition estimates
- Cuisine preference in plan generation plus recipe search and filters
- Balanced, pantry-first, quick-week, batch-cooking, and variety planning modes
- Temporary protein, fibre, iron, calcium, and vitamin C focus
- Meal pinning, swapping, skipping, and household serving adjustment
- Multiple person profiles with different portions and planning targets
- Deterministic daily and weekly nutrition arithmetic
- Visible nutrition completeness; missing nutrient values are not converted to zero
- Pantry items with exact, count, and uncertain status modes
- Ingredient normalization and pantry subtraction
- Shopping-list provenance: gross requirement, pantry deduction, source meals, and final amount
- Editable shopping quantities, manual items, item states, checks, and suppression
- Manual shopping changes preserved while the plan-derived list refreshes
- Shareable pantry and shopping snapshots using URL fragments
- Installable PWA shell and cached active application files
- Local JSON export
- Responsive desktop and 360–430 px mobile layouts
- Reliable confirmed deletion for pantry items, people and shopping rows
- Pure calculation and catalogue modules with Node unit tests

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

Recipe instructions are original simplified home-cooking instructions. Nutrition is calculated as an approximate planning estimate from structured ingredient quantities; it is not production food-composition or medical data.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Tests

```bash
npm test
```

The tests cover canonical unit normalization, scaled ingredient aggregation, pantry subtraction invariants, uncertain pantry handling, missing-nutrient semantics, the exact 500-recipe count, cuisine distribution, recipe completeness, unique IDs, and prohibited-ingredient vocabulary. Browser smoke checks additionally cover desktop and mobile recipe browsing plus pantry/person deletion.

## Deployment

The current production site is served from `main`. Specification-aligned changes should first be reviewed on a branch or pull request before merging into the stable deployment.
