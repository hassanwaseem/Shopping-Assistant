# Pamplona Pantry

A privacy-first, static personal shopping assistant for Pamplona. It creates a seven-day meal plan, estimates calories, builds a combined ingredient list, removes pantry items, tracks purchased items, and compares sample supermarket prices.

## Features

- Seven-day breakfast, lunch, dinner and snack plan
- Balanced, vegetarian and high-protein modes
- Household-size, calorie-target and budget controls
- Ingredient consolidation across the whole week
- Pantry-aware automatic shopping-list trimming
- Per-dish and daily calorie estimates
- Searchable product catalogue with lowest-price highlighting
- Browser storage: no account or database required
- Mobile-friendly and printable

## Run locally

Because the app loads JSON with `fetch`, serve the folder rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`.
4. Save.

## Product-price data

`data/products.json` contains demonstration data only. Prices are not live and should not be relied on at checkout.

The app deliberately keeps supermarket acquisition separate from the UI. To use live data, populate the JSON from an authorised API, a licensed feed, manual CSV export, or a scraper that complies with the relevant website terms, robots policy, rate limits and applicable law.

Expected product structure:

```json
{
  "name": "Whole milk 1 L",
  "category": "dairy",
  "store": "Eroski",
  "price": 1.05,
  "unit": "1 L"
}
```

## Calories

Calorie values are approximate recipe-level estimates. They are intended for meal-planning convenience, not clinical nutrition or medical use.

## Suggested next phase

- Add a small scheduled backend that refreshes authorised product feeds.
- Add recipe editing and dietary exclusions.
- Add quantity parsing so the shopping list calculates exact package counts.
- Add store-optimisation: cheapest single store versus cheapest split basket.
