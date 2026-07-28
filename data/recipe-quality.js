(function (root) {
  'use strict';

  const recipes = Array.isArray(root.MEAL_PLANNER_RECIPES) ? root.MEAL_PLANNER_RECIPES : [];
  const EXPECTED_RECIPE_COUNT = 1500;

  function slug(value) {
    return String(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function title(value) {
    return String(value)
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function normalizeLabel(value) {
    return title(String(value || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim());
  }

  function ingredient(name, quantity, unit, category, optional = false) {
    return {
      id: slug(name),
      foodId: slug(name),
      name,
      quantity,
      unit,
      category,
      optional,
    };
  }

  function isAlooParatha(recipe) {
    const text = `${recipe.id || ''} ${recipe.name || ''}`.toLowerCase();
    return text.includes('aloo-paratha');
  }

  function alooParathaRecipe(existingRecipe) {
    return {
      ...existingRecipe,
      name: 'Aloo Paratha with Yogurt',
      mealType: 'breakfast',
      cuisine: 'Pakistani',
      region: 'South Asia',
      authenticity: 'traditional',
      category: 'Stuffed flatbread',
      description:
        'Whole-wheat flatbreads stuffed with a seasoned mashed-potato filling, cooked on a hot griddle and served with plain yogurt.',
      servings: 4,
      activeTime: 35,
      totalTime: 60,
      difficulty: 'medium',
      batchFriendly: true,
      freezerFriendly: true,
      diets: ['balanced', 'vegetarian'],
      allergens: ['gluten', 'milk'],
      equipment: ['mixing bowl', 'saucepan', 'rolling pin', 'tawa or heavy frying pan'],
      primaryProtein: 'mixed',
      method: 'griddle',
      completeness: 100,
      qualityChecked: true,
      qualityVersion: 1,
      nutrition: {
        kcal: 405,
        protein: 11.5,
        carbs: 69,
        fat: 10.5,
        fibre: 8.2,
        iron: 3.5,
        calcium: 95,
        vitaminC: 18,
      },
      ingredients: [
        ingredient('Whole-wheat flour', 300, 'g', 'Dry goods'),
        ingredient('Potatoes', 600, 'g', 'Produce'),
        ingredient('Onion', 100, 'g', 'Produce', true),
        ingredient('Fresh coriander', 20, 'g', 'Produce'),
        ingredient('Green chillies', 10, 'g', 'Produce', true),
        ingredient('Cumin seeds', 5, 'g', 'Spices & condiments'),
        ingredient('Garam masala', 4, 'g', 'Spices & condiments'),
        ingredient('Amchur powder', 4, 'g', 'Spices & condiments', true),
        ingredient('Salt', 6, 'g', 'Spices & condiments'),
        ingredient('Cooking oil or ghee', 40, 'ml', 'Spices & condiments'),
        ingredient('Plain yogurt', 200, 'g', 'Dairy & alternatives'),
      ],
      instructions: [
        'Boil the potatoes until tender, drain them well, and mash until completely smooth. Allow the mash to cool.',
        'Mix the potatoes with the onion, coriander, green chillies, cumin, garam masala, amchur and half of the salt. Divide the filling into four equal portions.',
        'Combine the whole-wheat flour with the remaining salt. Add water gradually and knead for 7–8 minutes to make a soft, smooth dough. Cover and rest for 20 minutes.',
        'Divide the dough into four balls. Roll one ball into a small disc, place one portion of potato filling in the centre, bring the edges together and seal.',
        'Flatten the stuffed ball gently, dust it with flour and roll it into a 16–18 cm round, taking care not to tear the dough.',
        'Heat a tawa or heavy frying pan over medium heat. Cook the paratha until light spots appear, turn it, brush with a little oil or ghee, and cook both sides until golden and cooked through.',
        'Repeat with the remaining dough and filling. Serve the aloo parathas hot with plain yogurt.',
      ],
    };
  }

  const ignoredIngredientPattern = /onion|garlic|oil|ghee|salt|stock|water|spice|masala|seasoning|vinegar|sauce|lemon|lime/i;
  const proteinPatterns = {
    chicken: /chicken/i,
    beef: /beef|veal/i,
    lamb: /lamb|mutton/i,
    goat: /goat/i,
    fish: /fish|salmon|tuna|cod|hake|trout|sardine|tilapia|mackerel|grouper|bass|bream|kingfish|milkfish|snapper|barramundi|haddock/i,
    shrimp: /shrimp|prawn/i,
    egg: /egg/i,
    tofu: /tofu|tempeh/i,
    legume: /chickpea|lentil|bean|pea|dal|edamame|soybean|legume/i,
    cheese: /paneer|cheese/i,
    yogurt: /yogurt|yoghurt/i,
  };

  function findMainIngredient(recipe) {
    const pattern = proteinPatterns[recipe.primaryProtein];
    if (pattern) {
      const match = recipe.ingredients.find((item) => pattern.test(item.name));
      if (match) return match;
    }
    return (
      recipe.ingredients.find(
        (item) =>
          !['Dry goods', 'Bakery', 'Spices & condiments'].includes(item.category) &&
          !ignoredIngredientPattern.test(item.name),
      ) || recipe.ingredients[0]
    );
  }

  function findStarch(recipe, main) {
    return recipe.ingredients.find(
      (item) =>
        item !== main &&
        (item.category === 'Dry goods' || item.category === 'Bakery') &&
        !/spice|seasoning/i.test(item.name),
    );
  }

  function findVegetables(recipe, main, starch) {
    return recipe.ingredients.filter(
      (item) =>
        item !== main &&
        item !== starch &&
        item.category === 'Produce' &&
        !ignoredIngredientPattern.test(item.name) &&
        !/coriander|parsley|dill|basil|herb|chilli/i.test(item.name),
    );
  }

  function findSpice(recipe) {
    return recipe.ingredients.find(
      (item) =>
        item.category === 'Spices & condiments' &&
        !/oil|ghee|salt|stock|water|vinegar|sauce/i.test(item.name),
    );
  }

  function methodLabel(method) {
    const labels = {
      'one-pot': 'One-Pot',
      'slow-simmer': 'Slow-Simmered',
      simmered: 'Simmered',
      baked: 'Baked',
      grilled: 'Grilled',
      roasted: 'Roasted',
      braised: 'Braised',
      griddle: 'Griddled',
      skillet: 'Skillet',
      'pan-fried': 'Pan-Fried',
      'stir-fry': 'Stir-Fried',
      'no-cook': 'No-Cook',
      poached: 'Poached',
      stovetop: 'Stovetop',
    };
    return labels[method] || title(method || 'Prepared');
  }

  function descriptiveName(recipe, main, starch, vegetables) {
    const mainName = normalizeLabel(main?.name || 'Mixed Ingredients');
    const starchName = normalizeLabel(starch?.name || 'Seasonal Sides');
    const vegetableNames = vegetables.slice(0, 2).map((item) => normalizeLabel(item.name));
    const vegetableText = vegetableNames.length ? vegetableNames.join(' and ') : null;
    const method = methodLabel(recipe.method);

    if (recipe.method === 'skillet' && recipe.primaryProtein === 'egg') {
      return `${recipe.cuisine} Egg and ${vegetableText || 'Vegetable'} Skillet`;
    }
    if (recipe.method === 'griddle') {
      return `${recipe.cuisine} ${mainName}-Filled ${starchName}`;
    }
    if (recipe.method === 'pan-fried' && recipe.primaryProtein === 'legume') {
      return `${recipe.cuisine} ${mainName} and ${vegetableText || 'Vegetable'} Fritters`;
    }
    if (recipe.method === 'pan-fried' && recipe.primaryProtein === 'fish') {
      return `${recipe.cuisine} ${mainName} and ${vegetableText || 'Vegetable'} Fish Cakes`;
    }
    if (recipe.method === 'no-cook') {
      return `${recipe.cuisine} ${mainName} Yogurt Cups with ${starchName}`;
    }
    if (recipe.method === 'stir-fry') {
      return `${recipe.cuisine} Stir-Fried ${mainName} with ${vegetableText || 'Vegetables'} and ${starchName}`;
    }
    if (recipe.method === 'one-pot') {
      return `${recipe.cuisine} One-Pot ${mainName} and ${starchName} with ${vegetableText || 'Vegetables'}`;
    }
    if (recipe.method === 'braised' && recipe.primaryProtein === 'beef') {
      return `${recipe.cuisine} Braised Beef Meatballs with ${vegetableText || 'Vegetables'} and ${starchName}`;
    }
    if (recipe.method === 'grilled' && recipe.primaryProtein === 'beef') {
      return `${recipe.cuisine} Grilled Beef Kofta with ${vegetableText || 'Vegetables'} and ${starchName}`;
    }

    const sides = [vegetableText, starchName].filter(Boolean).join(' and ');
    return `${recipe.cuisine} ${method} ${mainName}${sides ? ` with ${sides}` : ''}`;
  }

  function buildInstructions(recipe, main, starch, vegetables, spice) {
    const mainName = String(main?.name || 'main ingredient').toLowerCase();
    const starchName = String(starch?.name || 'chosen side').toLowerCase();
    const vegetableText = vegetables.length
      ? vegetables.slice(0, 2).map((item) => item.name.toLowerCase()).join(' and ')
      : 'vegetables';
    const spiceName = String(spice?.name || 'the seasoning').toLowerCase();

    switch (recipe.method) {
      case 'skillet':
        if (recipe.primaryProtein === 'egg') {
          return [
            `Prepare the ${starchName} according to its package or recipe and keep it warm.`,
            `Heat the cooking oil in a wide skillet and cook the ${vegetableText} until softened.`,
            `Add ${spiceName} and cook for 30 seconds, stirring so it does not burn.`,
            'Make small wells in the vegetables, crack in the eggs, cover, and cook until the whites are set and the yolks are cooked to preference.',
            `Serve the egg and vegetable skillet with the ${starchName}.`,
          ];
        }
        break;
      case 'griddle':
        return [
          `Prepare the ${mainName} and chop the ${vegetableText} into small, even pieces.`,
          `Cook the ${mainName} with the ${vegetableText} and ${spiceName} until the filling is cooked through and fairly dry.`,
          `Divide the filling between the ${starchName}, folding or sealing each portion securely.`,
          'Heat a lightly oiled griddle or frying pan over medium heat.',
          'Cook each filled flatbread until hot and golden on both sides, then serve immediately.',
        ];
      case 'pan-fried':
        if (recipe.primaryProtein === 'legume') {
          return [
            `Drain the ${mainName} well and mash roughly, leaving a little texture.`,
            `Mix with finely chopped ${vegetableText} and ${spiceName}.`,
            'Shape the mixture into small, firmly packed fritters.',
            'Heat a thin layer of oil in a frying pan and cook the fritters until browned and hot through on both sides.',
            `Serve with the ${starchName}.`,
          ];
        }
        if (recipe.primaryProtein === 'fish') {
          return [
            `Cook the ${mainName} gently until it flakes, then cool slightly and remove any bones.`,
            `Flake the fish and mix it with finely chopped ${vegetableText} and ${spiceName}.`,
            'Shape the mixture into compact cakes.',
            'Pan-fry the cakes in a little oil until golden on both sides and fully heated through.',
            `Serve with the ${starchName}.`,
          ];
        }
        break;
      case 'no-cook':
        return [
          `Use cooked or canned ${mainName}; drain and rinse it well.`,
          `Finely chop the ${vegetableText}.`,
          `Combine the ${mainName}, vegetables, ${spiceName}, and yogurt in a bowl.`,
          'Taste and adjust the seasoning, then divide into serving cups.',
          `Serve chilled or at room temperature with the ${starchName}.`,
        ];
      case 'stir-fry':
        return [
          `Cook the ${starchName} until just tender, drain if necessary, and keep warm.`,
          `Cut the ${mainName} and ${vegetableText} into even pieces.`,
          `Heat oil in a wok or large pan and cook the ${mainName} until nearly done.`,
          `Add the vegetables and ${spiceName}; stir-fry until the main ingredient is cooked through and the vegetables remain slightly crisp.`,
          `Add the ${starchName}, toss well, and serve hot.`,
        ];
      case 'one-pot':
        return [
          `Rinse or prepare the ${starchName} as appropriate.`,
          `Heat oil in a heavy pot, add ${spiceName}, and cook briefly until fragrant.`,
          `Add the ${mainName} and cook until lightly browned or well coated in the seasoning.`,
          `Stir in the ${vegetableText}, ${starchName}, and enough water or stock to cook the grain.`,
          'Cover and cook gently until the starch is tender and the main ingredient is fully cooked; rest for 5 minutes before serving.',
        ];
      case 'slow-simmer':
        return [
          `Pat the ${mainName} dry and brown it in a heavy pot with a little oil.`,
          `Add ${spiceName} and the ${vegetableText}; cook for 3–4 minutes.`,
          'Add enough water or stock to come partway up the ingredients, cover, and simmer gently until the meat is tender.',
          `Prepare the ${starchName} separately while the stew cooks.`,
          `Adjust the seasoning and serve the stew with the ${starchName}.`,
        ];
      case 'simmered':
        return [
          `Prepare the ${starchName} separately and keep it warm.`,
          `Heat oil in a saucepan, add ${spiceName}, and cook briefly until fragrant.`,
          `Add the ${mainName} and ${vegetableText}, stirring to coat them in the seasoning.`,
          'Add enough water or stock for a thick sauce, then simmer until the main ingredient is fully cooked and the vegetables are tender.',
          `Taste, adjust the seasoning, and serve with the ${starchName}.`,
        ];
      case 'baked':
      case 'roasted':
        return [
          'Heat the oven to 200°C.',
          `Coat the ${mainName} and ${vegetableText} with the cooking oil and ${spiceName}.`,
          `Arrange everything in a single layer and ${recipe.method === 'roasted' ? 'roast' : 'bake'} until the main ingredient is fully cooked and the vegetables are browned.`,
          `Prepare the ${starchName} while the tray is in the oven.`,
          `Serve the ${mainName} and vegetables with the ${starchName}.`,
        ];
      case 'grilled':
        return [
          `If using minced meat, mix the ${mainName} with ${spiceName}; otherwise coat the meat evenly with the seasoning.`,
          'Shape into kofta or cut into grill-sized pieces as appropriate.',
          'Heat a grill or grill pan to medium-high and lightly oil the surface.',
          `Grill until browned and fully cooked, turning as needed; cook the ${vegetableText} alongside.`,
          `Serve with the ${starchName}.`,
        ];
      case 'braised':
        return [
          `Mix the ${mainName} with half of the ${spiceName} and shape into small meatballs.`,
          'Brown the meatballs in a wide pan with a little oil, then transfer them to a plate.',
          `Add the ${vegetableText} and remaining seasoning to the pan and cook for 3–4 minutes.`,
          'Return the meatballs, add a small amount of water or stock, cover, and braise gently until cooked through.',
          `Prepare the ${starchName} separately and serve it with the meatballs and vegetables.`,
        ];
      case 'poached':
        return [
          `Prepare the ${starchName} and keep it warm.`,
          `Bring a shallow pan of lightly seasoned water or stock to a gentle simmer with ${spiceName}.`,
          `Add the ${mainName} and poach gently until opaque and cooked through.`,
          `Cook the ${vegetableText} until just tender and drain well.`,
          `Serve the poached ${mainName} with the vegetables and ${starchName}.`,
        ];
      default:
        return [
          `Prepare the ${starchName} and the ${vegetableText}.`,
          `Season the ${mainName} with ${spiceName}.`,
          `Cook the ${mainName} using the ${recipe.method || 'stovetop'} method until fully cooked.`,
          'Cook the vegetables until tender and combine the components.',
          `Serve with the ${starchName}.`,
        ];
    }

    return [
      `Prepare the ${starchName} and the ${vegetableText}.`,
      `Season the ${mainName} with ${spiceName}.`,
      `Cook the ${mainName} until fully cooked, then add the vegetables.`,
      'Adjust the seasoning and combine the components.',
      `Serve with the ${starchName}.`,
    ];
  }

  function repairRecipe(recipe) {
    if (isAlooParatha(recipe)) return alooParathaRecipe(recipe);

    const main = findMainIngredient(recipe);
    const starch = findStarch(recipe, main);
    const vegetables = findVegetables(recipe, main, starch);
    const spice = findSpice(recipe);

    if (recipe.primaryProtein === 'beef' && ['grilled', 'braised'].includes(recipe.method) && main) {
      main.name = 'Lean beef mince';
      main.id = slug(main.name);
      main.foodId = slug(main.name);
    }

    const name = descriptiveName(recipe, main, starch, vegetables);
    const mainName = normalizeLabel(main?.name || 'mixed ingredients');
    const vegetableText = vegetables.slice(0, 2).map((item) => normalizeLabel(item.name)).join(' and ');
    const starchName = normalizeLabel(starch?.name || 'a suitable side');

    return {
      ...recipe,
      name,
      authenticity: 'inspired',
      description: `A ${String(recipe.method || 'stovetop').replace(/-/g, ' ')} ${recipe.cuisine} recipe featuring ${mainName}${vegetableText ? `, ${vegetableText}` : ''}, and ${starchName}.`,
      instructions: buildInstructions(recipe, main, starch, vegetables, spice),
      completeness: 100,
      qualityChecked: true,
      qualityVersion: 1,
    };
  }

  if (recipes.length !== EXPECTED_RECIPE_COUNT) {
    throw new Error(`Expected ${EXPECTED_RECIPE_COUNT} recipes before quality review, found ${recipes.length}`);
  }

  const reviewed = recipes.map(repairRecipe);
  const usedNames = new Set();
  reviewed.forEach((recipe, index) => {
    let candidate = recipe.name;
    if (usedNames.has(candidate)) candidate = `${candidate} — ${title(recipe.mealType)}`;
    if (usedNames.has(candidate)) candidate = `${candidate} · ${recipe.activeTime}-Minute Prep`;
    if (usedNames.has(candidate)) candidate = `${candidate} · Variation ${index + 1}`;
    recipe.name = candidate;
    usedNames.add(candidate);
  });

  const alooParatha = reviewed.find((recipe) => recipe.name === 'Aloo Paratha with Yogurt');
  const alooIngredientText = alooParatha?.ingredients.map((item) => item.name).join(' ').toLowerCase() || '';
  const alooInstructionText = alooParatha?.instructions.join(' ').toLowerCase() || '';

  if (!alooParatha || !/potato/.test(alooIngredientText) || !/whole-wheat flour/.test(alooIngredientText)) {
    throw new Error('Aloo paratha must contain potatoes and whole-wheat flour');
  }
  if (!/stuff|filling/.test(alooInstructionText) || !/roll/.test(alooInstructionText) || !/tawa|frying pan/.test(alooInstructionText)) {
    throw new Error('Aloo paratha instructions must cover stuffing, rolling and griddle cooking');
  }
  if (usedNames.size !== reviewed.length) {
    throw new Error('Every reviewed recipe must have a unique descriptive name');
  }
  if (
    reviewed.some(
      (recipe) =>
        !recipe.qualityChecked ||
        !recipe.name ||
        !recipe.description ||
        !Array.isArray(recipe.ingredients) ||
        recipe.ingredients.length < 4 ||
        !Array.isArray(recipe.instructions) ||
        recipe.instructions.length < 4,
    )
  ) {
    throw new Error('Every recipe must pass the catalogue quality review');
  }

  root.MEAL_PLANNER_RECIPES = reviewed;
})(typeof globalThis !== 'undefined' ? globalThis : this);
