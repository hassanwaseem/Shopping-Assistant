(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PakistaniRecipeAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DISH_TYPES = [
    'Main dishes',
    'Curries & stews',
    'Rice & biryani',
    'Daal & legumes',
    'Breakfast',
    'Breads',
    'Snacks & street food',
    'Sides & vegetables',
    'Desserts',
    'Drinks',
  ];

  const MAIN_INGREDIENTS = [
    'Chicken',
    'Beef',
    'Mutton, lamb & goat',
    'Fish & seafood',
    'Lentils & beans',
    'Vegetables',
    'Eggs',
    'Paneer & dairy',
    'Rice',
    'Mixed or other',
  ];

  function slug(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function searchable(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleCase(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : 'Ingredient';
  }

  function cuisineFor(source) {
    const identity = `${source.name || ''} ${source.dish_family || ''} ${source.region || ''}`;
    return /afghan/i.test(identity) ? 'Afghan' : 'Pakistani';
  }

  function regionFor(source, cuisine) {
    const value = String(source.region || '').trim();
    if (!value) return cuisine === 'Afghan' ? 'Afghanistan' : 'Pakistan-wide';
    if (/khyber|^kp\b/i.test(value)) return 'Khyber Pakhtunkhwa';
    if (/gilgit/i.test(value)) return 'Gilgit-Baltistan';
    if (/azad kashmir/i.test(value)) return 'Azad Kashmir';
    if (/baloch/i.test(value)) return 'Balochistan';
    if (/sindh|karachi/i.test(value)) return 'Sindh';
    if (/punjab|multan/i.test(value)) return 'Punjab';
    return value;
  }

  function combinedRecipeText(source) {
    return searchable([
      source.name,
      source.dish_family,
      source.category,
      ...(source.ingredients || []).flatMap((item) => [item.item, item.preparation, item.text]),
    ].join(' '));
  }

  function dishTypeFor(source) {
    const category = searchable(source.category);
    const text = searchable(`${source.name} ${source.dish_family || ''} ${source.category || ''}`);

    if (/beverage|drinks?/.test(category) || /\b(chai|tea|kahwa|kehwa|lassi|sharbat|drink)\b/.test(text)) return 'Drinks';
    if (/dessert/.test(category) || /\b(halwa|kheer|kulfi|gulab jamun|jalebi|seviyan|sheer khurma|mithai|pudding|zarda|cake|rusk|biscuit|cookie)\b/.test(text)) return 'Desserts';
    if (/breakfast/.test(category) || /\b(nashta|breakfast|halwa puri|anda paratha|anday wala paratha|egg bhurji|khagina|omelette|omelet)\b/.test(text)) return 'Breakfast';
    if (/appetizer|snack|kebab/.test(category) || /\b(chaat|kebab|kabab|tikka|pakora|samosas?|gol gapp|bun kebab|fritter|cutlet)\b/.test(text)) return 'Snacks & street food';
    if (/naan|roti|bread/.test(category) || /\b(naan|roti|chapati|paratha|puri|sheermal|kulcha|flatbread)\b/.test(text)) return 'Breads';
    if (/\b(biryani|pulao|pilaf|khichdi|khichri|tehri|fried rice|rice)\b/.test(text)) return 'Rice & biryani';
    if (/daal/.test(category) || /\b(daal|dal|lentil|chana|cholay|chole|rajma|lobia|black-eyed pea|chickpea)\b/.test(text)) return 'Daal & legumes';
    if (/side|salad/.test(category) || /\b(chutney|raita|achar|pickle|salad|bhujia|sabzi|bharta)\b/.test(text)) return 'Sides & vegetables';
    if (/\b(karahi|handi|curry|salan|shorba|qorma|korma|nihari|haleem|gosht|dampukht|bhuna|stew)\b/.test(text)) return 'Curries & stews';
    return 'Main dishes';
  }

  function recipeNameFor(source) {
    const value = String(source.name || '').trim();
    const guestRecipe = value.match(/^guest post\b.*\brecipe for\s+(.+)$/i);
    return guestRecipe ? guestRecipe[1].trim() : value;
  }

  function mainIngredientFor(source) {
    const text = combinedRecipeText(source);
    if (/\b(chicken|murgh|murghi)\b/.test(text)) return 'Chicken';
    if (/\b(beef|gaaye|gaye)\b/.test(text)) return 'Beef';
    if (/\b(mutton|lamb|goat|bakra|gosht|kaleji|liver)\b/.test(text)) return 'Mutton, lamb & goat';
    if (/\b(fish|machli|prawn|shrimp|seafood|crab)\b/.test(text)) return 'Fish & seafood';
    if (/\b(egg|eggs|anda|anday)\b/.test(text)) return 'Eggs';
    if (/\b(daal|dal|lentil|chana|cholay|chickpea|bean|rajma|lobia|black-eyed pea)\b/.test(text)) return 'Lentils & beans';
    if (/\b(paneer|cheese|milk|doodh|yogurt|yoghurt|dahi|cream|khoya|mawa)\b/.test(text)) return 'Paneer & dairy';
    if (/\b(rice|chawal|basmati|biryani|pulao)\b/.test(text)) return 'Rice';
    if (/\b(aloo|potato|baingan|aubergine|eggplant|bhindi|okra|gobi|cauliflower|palak|spinach|sabzi|vegetable|turnip|pumpkin|gawar|courgette|zucchini)\b/.test(text)) return 'Vegetables';
    return 'Mixed or other';
  }

  function canonicalIngredientName(source) {
    const item = String(source.item || '').trim();
    const preparation = String(source.preparation || '').trim();
    const text = searchable(`${item} ${preparation}`);

    const aliases = [
      [/adrak[- ]?lehsan|adrak lahsun|ginger[- ]?garlic/, 'Ginger-garlic paste'],
      [/\b(pyaaz|pyaz|onions?)\b/, 'Onions'],
      [/\b(tamatar|tomatoes?)\b/, 'Tomatoes'],
      [/\b(hara dhania|fresh coriander|cilantro)\b/, 'Fresh coriander'],
      [/\b(dhania|dhaniya) powder\b|\bground coriander\b/, 'Ground coriander'],
      [/\b(hari mirch|green chill)/, 'Green chillies'],
      [/\b(lal mirch|red chill).*(powder|ground)/, 'Red chilli powder'],
      [/\b(haldi|turmeric)\b/, 'Turmeric'],
      [/\b(zeera|jeera|cumin seeds?)\b/, 'Cumin seeds'],
      [/\b(garam masala)\b/, 'Garam masala'],
      [/\b(namak|salt)\b/, 'Salt'],
      [/\b(dahi|yogurt|yoghurt)\b/, 'Plain yogurt'],
      [/\b(doodh|milk)\b/, 'Milk'],
      [/\b(ghee)\b/, /tel|tail|oil/.test(text) ? 'Cooking oil or ghee' : 'Ghee'],
      [/\b(tel|tail|cooking oil|neutral oil|corn oil|sunflower oil|vegetable oil)\b/, 'Cooking oil'],
      [/\b(basmati|chawal|rice)\b/, /basmati/.test(text) ? 'Basmati rice' : 'Rice'],
      [/\b(bakra gosht|mutton|lamb|goat meat)\b/, 'Mutton or lamb'],
      [/\b(beef)\b/, 'Beef'],
      [/\b(chicken|murgh|murghi)\b/, 'Chicken'],
      [/\b(gosht|meat)\b/, 'Meat'],
      [/\b(machli|fish)\b/, 'Fish'],
      [/\b(prawn|shrimp)\b/, 'Prawns'],
      [/\b(anday|anda|eggs?)\b/, 'Eggs'],
      [/\b(aloo|potatoes?)\b/, 'Potatoes'],
      [/\b(lehsan|lahsun|garlic)\b/, 'Garlic'],
      [/\b(adrak|ginger)\b/, 'Ginger'],
      [/\b(atta|aata|whole[- ]?wheat flour)\b/, 'Whole-wheat flour'],
      [/\b(maida|plain flour|all[- ]?purpose flour)\b/, 'Plain flour'],
      [/\b(chana dal|chanay ki daal)\b/, 'Chana dal'],
      [/\b(masoor|red lentils?)\b/, 'Red lentils'],
      [/\b(moong|mung)\b/, 'Mung dal'],
      [/\b(chickpeas?|cholay|chole)\b/, 'Chickpeas'],
      [/\b(imli|tamarind)\b/, 'Tamarind'],
      [/\b(pudina|mint)\b/, 'Fresh mint'],
      [/\b(nimbu|lemon)\b/, 'Lemon'],
      [/\b(pani|water)\b/, 'Water'],
    ];

    const match = aliases.find(([pattern]) => pattern.test(text));
    return match ? match[1] : titleCase(item || preparation || source.text);
  }

  function ingredientCategory(name, sourceText) {
    const text = searchable(`${name} ${sourceText || ''}`);
    if (/\b(chicken|beef|mutton|lamb|goat|meat|fish|prawn|shrimp|kaleji|liver)\b/.test(text)) return 'Meat, fish & alternatives';
    if (/\b(milk|yogurt|yoghurt|dahi|cream|butter|ghee|paneer|cheese|khoya|mawa|egg)\b/.test(text)) return 'Dairy & alternatives';
    if (/\b(flour|atta|maida|rice|chawal|daal|dal|lentil|chickpea|bean|sugar|semolina|sooji|vermicelli|oats)\b/.test(text)) return 'Dry goods';
    if (/\b(naan|roti|chapati|bread|bun|papri)\b/.test(text)) return 'Bakery';
    if (/\b(oil|salt|pepper|chilli|masala|turmeric|haldi|cumin|zeera|coriander powder|spice|vinegar|mustard|saffron|cardamom|cinnamon|clove|pickle)\b/.test(text)) return 'Spices & condiments';
    if (/\b(tin|canned)\b/.test(text)) return 'Canned foods';
    return 'Produce';
  }

  function normalizedUnit(value, hasAmount) {
    const unit = searchable(value);
    const aliases = {
      gram: 'g',
      grams: 'g',
      kilogram: 'kg',
      kilograms: 'kg',
      millilitre: 'ml',
      millilitres: 'ml',
      liter: 'l',
      litre: 'l',
      liters: 'l',
      litres: 'l',
      tablespoon: 'tbsp',
      tablespoons: 'tbsp',
      teaspoon: 'tsp',
      teaspoons: 'tsp',
      cups: 'cup',
      cloves: 'clove',
      pieces: 'piece',
      packets: 'packet',
      tins: 'tin',
      pounds: 'lb',
      lbs: 'lb',
      ounces: 'oz',
    };
    if (aliases[unit]) return aliases[unit];
    if (unit) return unit;
    return hasAmount ? 'count' : 'as needed';
  }

  function ingredientFromSource(source, index) {
    const hasAmount = Number.isFinite(Number(source.amount));
    const quantity = hasAmount ? Number(source.amount) : 1;
    const unit = normalizedUnit(source.unit, hasAmount);
    const name = canonicalIngredientName(source);
    const displayText = String(source.text || '').trim()
      || `${hasAmount ? `${quantity} ${unit} ` : ''}${String(source.item || name).trim()}`;
    const optional = /\b(optional|if desired)\b/i.test(displayText);

    return {
      id: `${slug(name) || 'ingredient'}-${index + 1}`,
      foodId: slug(name),
      name,
      quantity,
      unit,
      category: ingredientCategory(name, displayText),
      optional,
      approximate: !hasAmount,
      displayText,
    };
  }

  function dietaryTagsFor(source) {
    const text = combinedRecipeText(source);
    const allergens = new Set((source.allergens || []).map((value) => searchable(value)));
    const containsAnimal = /\b(chicken|murgh|murghi|beef|mutton|lamb|goat|bakra|gosht|keema|meat|fish|machli|prawn|shrimp|seafood|crab|kaleji|liver|gelatin)\b/.test(text);
    const containsEgg = /\b(egg|eggs|anda|anday)\b/.test(text) || allergens.has('egg');
    const containsDairy = /\b(milk|doodh|cream|yogurt|yoghurt|dahi|butter|ghee|paneer|cheese|khoya|mawa)\b/.test(text) || allergens.has('milk');
    const containsHoney = /\bhoney\b/.test(text);
    const protein = Number(source.nutrition_per_serving?.protein_g || 0);
    const fibre = Number(source.nutrition_per_serving?.fiber_g || 0);
    const tags = ['balanced'];
    if (!containsAnimal) tags.push('vegetarian');
    if (!containsAnimal && !containsEgg && !containsDairy && !containsHoney) tags.push('vegan');
    if (protein >= 25) tags.push('high-protein');
    if (fibre >= 8) tags.push('high-fibre');
    return tags;
  }

  function mealSlotsFor(dishType, source) {
    if (dishType === 'Breakfast') return ['breakfast'];
    if (['Main dishes', 'Curries & stews', 'Rice & biryani', 'Daal & legumes'].includes(dishType)) return ['lunch', 'dinner'];
    if (dishType === 'Sides & vegetables' && /main course|vegetarian recipes|curries/i.test(String(source.category || ''))) return ['lunch', 'dinner'];
    return [];
  }

  function primaryProteinFor(mainIngredient) {
    return {
      Chicken: 'chicken',
      Beef: 'beef',
      'Mutton, lamb & goat': 'lamb',
      'Fish & seafood': 'fish',
      'Lentils & beans': 'legume',
      Eggs: 'egg',
      'Paneer & dairy': 'dairy',
      Vegetables: 'vegetable',
      Rice: 'mixed',
      'Mixed or other': 'mixed',
    }[mainIngredient] || 'mixed';
  }

  function nutritionFor(source) {
    const nutrition = source.nutrition_per_serving || {};
    return {
      kcal: Number(nutrition.kcal || 0),
      protein: Number(nutrition.protein_g || 0),
      carbs: Number(nutrition.carbs_g || 0),
      fat: Number(nutrition.fat_g || 0),
      fibre: Number(nutrition.fiber_g || 0),
      iron: Number(nutrition.iron_mg || 0),
      calcium: Number(nutrition.calcium_mg || 0),
      vitaminC: Number(nutrition.vitamin_c_mg || 0),
      sodium: Number(nutrition.sodium_mg || 0),
    };
  }

  function completenessFor(source) {
    const confidence = searchable(source.nutrition_per_serving?.confidence);
    if (confidence.includes('high')) return 92;
    if (confidence.includes('moderate')) return 82;
    if (confidence.includes('low')) return 68;
    return 75;
  }

  function recipeDescription(source, cuisine, region, dishType, mainIngredient) {
    const place = region === 'Pakistan-wide'
      ? 'Pakistani'
      : region === 'Afghanistan'
        ? 'Afghan'
        : `${region} Pakistani`;
    const typeLabel = {
      'Main dishes': 'main dish',
      'Curries & stews': 'curry or stew',
      'Rice & biryani': 'rice or biryani dish',
      'Daal & legumes': 'daal or legume dish',
      Breakfast: 'breakfast dish',
      Breads: 'bread',
      'Snacks & street food': 'snack or street-food dish',
      'Sides & vegetables': 'side or vegetable dish',
      Desserts: 'dessert',
      Drinks: 'drink',
    }[dishType] || 'dish';
    const ingredient = mainIngredient === 'Mixed or other' ? '' : ` centred on ${mainIngredient.toLowerCase()}`;
    return `${recipeNameFor(source)} is a ${place} ${typeLabel}${ingredient}.`;
  }

  function adaptRecipe(source) {
    const cuisine = cuisineFor(source);
    const region = regionFor(source, cuisine);
    const dishType = dishTypeFor(source);
    const mainIngredient = mainIngredientFor(source);
    const prep = Number(source.times_minutes?.prep);
    const cook = Number(source.times_minutes?.cook);
    const statedTotal = Number(source.times_minutes?.total);
    const totalTime = Number.isFinite(statedTotal) && statedTotal > 0
      ? statedTotal
      : (Number.isFinite(prep) ? prep : 0) + (Number.isFinite(cook) ? cook : 0) || 30;
    const activeTime = Number.isFinite(prep) && prep > 0 ? prep : Math.min(totalTime, 20);
    const servings = Number(source.servings) > 0 ? Number(source.servings) : 4;
    const mealSlots = mealSlotsFor(dishType, source);
    const methodTags = Array.isArray(source.method?.tags) ? source.method.tags : [];

    return {
      id: String(source.id),
      name: recipeNameFor(source),
      family: String(source.dish_family || source.name),
      alternateNames: Array.isArray(source.alternate_names) ? source.alternate_names : [],
      mealType: mealSlots[0] || 'snack',
      mealSlots,
      cuisine,
      region,
      authenticity: 'traditional',
      category: dishType,
      dishType,
      mainIngredient,
      description: recipeDescription(source, cuisine, region, dishType, mainIngredient),
      servings,
      activeTime,
      totalTime,
      difficulty: ['easy', 'medium', 'hard'].includes(source.difficulty) ? source.difficulty : 'medium',
      batchFriendly: servings >= 4 && ['Main dishes', 'Curries & stews', 'Rice & biryani', 'Daal & legumes'].includes(dishType),
      freezerFriendly: ['Curries & stews', 'Daal & legumes'].includes(dishType),
      diets: dietaryTagsFor(source),
      allergens: Array.isArray(source.allergens) ? source.allergens.map((value) => String(value)) : [],
      primaryProtein: primaryProteinFor(mainIngredient),
      method: methodTags[0] || slug(dishType),
      completeness: completenessFor(source),
      nutrition: nutritionFor(source),
      nutritionBasis: String(source.nutrition_per_serving?.basis || 'estimated'),
      nutritionConfidence: String(source.nutrition_per_serving?.confidence || 'moderate'),
      ingredients: (source.ingredients || []).map(ingredientFromSource),
      instructions: Array.isArray(source.instructions) ? source.instructions.map((step) => String(step).trim()).filter(Boolean) : [],
      alternateMethods: Array.isArray(source.alternate_methods) ? source.alternate_methods : [],
      sources: Array.isArray(source.source_attributions) ? source.source_attributions : [],
    };
  }

  function adaptDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.dish_families)) throw new Error('Pakistani recipe data is not in the expected format.');
    const sourceRecipes = dataset.dish_families.flatMap((family) => family.variants || []);
    const recipes = sourceRecipes.map(adaptRecipe);
    const ids = new Set(recipes.map((recipe) => recipe.id));
    const expected = Number(dataset.variant_model?.recipe_variant_count || recipes.length);

    if (recipes.length !== expected) throw new Error(`Expected ${expected} Pakistani recipes, found ${recipes.length}.`);
    if (ids.size !== recipes.length) throw new Error('Pakistani recipe IDs must be unique.');
    if (recipes.some((recipe) => !recipe.ingredients.length || !recipe.instructions.length)) {
      throw new Error('Every Pakistani recipe must include ingredients and instructions.');
    }

    return recipes.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function load(url = './data/pakistani-recipes.json') {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load Pakistani recipes (${response.status}).`);
    return adaptDataset(await response.json());
  }

  return {
    DISH_TYPES,
    MAIN_INGREDIENTS,
    adaptDataset,
    adaptRecipe,
    cuisineFor,
    dietaryTagsFor,
    dishTypeFor,
    load,
    mainIngredientFor,
    regionFor,
    recipeNameFor,
    slug,
  };
});
