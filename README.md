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

`data/recipes.psv` contains 137 recipes covering breakfast, lunch, dinner, and snacks across a broad range of cuisines and cultural regions. The pipe-separated format is easy to parse into a database or API. Each row includes:

- stable recipe ID
- recipe name
- meal type
- category
- cuisine or cultural region
- approximate calories per serving
- dietary tags

The catalog is kept separate from the current front-end recipe array so it can be imported into a future backend without affecting the existing planner.

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
