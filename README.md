# Pantry Planner

A privacy-first static meal, calorie, pantry, and shopping-list planner.

## Features

- Seven-day breakfast, lunch, dinner, and snack plan
- Balanced, vegetarian, and high-protein modes
- Household-size and calorie-target controls
- Per-dish and per-day calorie estimates
- Consolidated ingredient list for the whole week
- Pantry checks that automatically trim the shopping list
- Shareable pantry links, using the device share sheet or clipboard
- Editable quantities in the final list
- Extra custom shopping items
- Removable and checkable shopping rows
- Browser storage with no account or database
- Mobile-friendly and printable
- Backend-ready recipe lookup catalog

## Recipe lookup catalog

The repository now contains **1,337 recipe lookup records**:

- `data/recipes.psv`: 137 original curated records
- `data/expanded-recipes.js`: 1,200 additional generated lookup records
- `data/recipe-catalog.json`: catalog manifest, counts, schema, and source paths

The expanded catalog covers 60 cuisine and cultural profiles, with the following meal-type distribution:

- 300 breakfasts
- 300 lunches
- 480 dinners
- 120 snacks

Each generated record includes:

- stable recipe ID
- recipe name
- meal type
- category
- cuisine or cultural region
- approximate calories per serving
- dietary tags

Generated variations use an `-inspired` cuisine label. This distinguishes catalog combinations from recipes presented as canonical traditional dishes.

### Backend or Node usage

```js
const {
  EXPANDED_RECIPES,
  EXPANDED_RECIPE_CATALOG_INFO
} = require("./data/expanded-recipes.js");

console.log(EXPANDED_RECIPES.length); // 1200
```

The lookup module also exposes the data on `globalThis` when loaded directly in a browser. Runtime assertions verify that exactly 1,200 records are generated and that every generated recipe ID is unique.

The catalog is kept separate from the current front-end recipe array so it can be connected to a future backend or imported into the planner without altering the existing interface first.

## Privacy and sharing

The planner stores its normal state in the browser using `localStorage`. Nothing is uploaded to a server.

When **Share pantry** is pressed, the pantry names and checked items are encoded into the URL fragment after `#pantry=`. A recipient opening that link imports the shared pantry into their browser. The fragment is not sent to GitHub Pages as part of the HTTP request, although anyone holding the link can read its contents.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save.

## Calories

Calorie values are approximate recipe-level estimates intended for meal-planning convenience, not clinical nutrition or medical use.
