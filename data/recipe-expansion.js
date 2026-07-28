(function (root) {
  "use strict";

  const PROFILES = [["Pakistani","South Asia","garam masala","basmati rice","wholemeal roti","chickpeas","chicken","white fish","spinach","okra"],["Punjabi","South Asia","cumin and coriander","basmati rice","chapati","black lentils","chicken","river fish","mustard greens","peas"],["Sindhi","South Asia","ajwain and chilli","basmati rice","roti","chana dal","chicken","white fish","okra","aubergine"],["Kashmiri","South Asia","fennel and cardamom","basmati rice","roti","kidney beans","chicken","trout","turnip","spinach"],["North Indian","South Asia","cumin and garam masala","basmati rice","chapati","kidney beans","chicken","white fish","spinach","cauliflower"],["South Indian","South Asia","mustard seed and curry leaf","rice","dosa","red lentils","chicken","mackerel","okra","cabbage"],["Bangladeshi","South Asia","mustard and cumin","rice","roti","red lentils","chicken","white fish","aubergine","okra"],["Sri Lankan","South Asia","roasted curry spice","red rice","roti","red lentils","chicken","tuna","aubergine","okra"],["Afghan","Central Asia","cumin and cardamom","basmati rice","naan","mung beans","chicken","white fish","carrot","spinach"],["Persian","West Asia","saffron and dried lime","basmati rice","flatbread","yellow split peas","chicken","white fish","aubergine","spinach"],["Turkish","West Asia","Aleppo pepper and cumin","bulgur","pide","white beans","chicken","sea bass","aubergine","pepper"],["Levantine","West Asia","zaatar and sumac","bulgur","pita","chickpeas","chicken","sea bream","aubergine","tomato"],["Gulf Arab","Arabian Peninsula","loomi and cardamom","basmati rice","khubz","chickpeas","chicken","grouper","pumpkin","tomato"],["Yemeni","Arabian Peninsula","hawaij and fenugreek","rice","malawah","fava beans","chicken","kingfish","tomato","okra"],["Egyptian","North Africa","cumin and dukkah","rice","baladi bread","fava beans","chicken","tilapia","spinach","tomato"],["Moroccan","North Africa","ras el hanout","couscous","khobz","chickpeas","chicken","sardines","carrot","courgette"],["Tunisian","North Africa","harissa and caraway","couscous","tabouna","chickpeas","chicken","tuna","pepper","tomato"],["Ethiopian","East Africa","berbere","teff","injera","red lentils","chicken","tilapia","cabbage","spinach"],["Somali","East Africa","xawaash","basmati rice","canjeero","black-eyed peas","chicken","tuna","spinach","tomato"],["Nigerian","West Africa","suya spice and ginger","rice","flatbread","black-eyed peas","chicken","mackerel","plantain","spinach"],["Ghanaian","West Africa","ginger and chilli","rice","tea bread","black-eyed peas","chicken","tilapia","plantain","spinach"],["Senegalese","West Africa","mustard and black pepper","broken rice","baguette","black-eyed peas","chicken","white fish","cassava","carrot"],["Kenyan","East Africa","pilau spice","rice","chapati","kidney beans","chicken","tilapia","collard greens","carrot"],["South African","Southern Africa","peri-peri and coriander","maize meal","roosterkoek","sugar beans","chicken","hake","spinach","pumpkin"],["Spanish","Southern Europe","smoked paprika and saffron","short-grain rice","wholegrain bread","white beans","chicken","hake","pepper","tomato"],["Portuguese","Southern Europe","paprika and bay","rice","broa","white beans","chicken","cod","kale","tomato"],["Italian","Southern Europe","basil and oregano","wholegrain pasta","ciabatta","cannellini beans","chicken","sea bass","aubergine","courgette"],["Greek","Southern Europe","oregano and lemon","barley","pita","chickpeas","chicken","sea bream","aubergine","courgette"],["French","Western Europe","thyme and tarragon","barley","wholegrain bread","white beans","chicken","cod","leek","carrot"],["British","Northern Europe","mustard and thyme","barley","wholemeal bread","green lentils","chicken","haddock","peas","carrot"],["Scandinavian","Northern Europe","dill and allspice","barley","rye bread","yellow peas","chicken","salmon","cabbage","carrot"],["Polish","Eastern Europe","marjoram and caraway","buckwheat","rye bread","white beans","chicken","trout","cabbage","beetroot"],["Balkan","Southeast Europe","paprika and parsley","bulgur","flatbread","white beans","chicken","trout","pepper","aubergine"],["Georgian","Caucasus","coriander and fenugreek","buckwheat","flatbread","kidney beans","chicken","trout","aubergine","spinach"],["Uzbek","Central Asia","cumin and coriander","rice","non bread","mung beans","chicken","trout","carrot","turnip"],["Chinese","East Asia","five-spice and ginger","brown rice","steamed bun","soybeans","chicken","white fish","bok choy","broccoli"],["Japanese","East Asia","miso and ginger","brown rice","rice cake","edamame","chicken","salmon","daikon","cabbage"],["Korean","East Asia","gochugaru and sesame","brown rice","flatbread","soybeans","chicken","mackerel","cabbage","spinach"],["Thai","Southeast Asia","lemongrass and lime","jasmine rice","rice pancake","mung beans","chicken","white fish","aubergine","green beans"],["Vietnamese","Southeast Asia","lemongrass and star anise","rice noodles","rice paper","mung beans","chicken","white fish","cabbage","carrot"],["Indonesian","Southeast Asia","turmeric and galangal","brown rice","flatbread","soybeans","chicken","mackerel","cabbage","green beans"],["Malaysian","Southeast Asia","lemongrass and turmeric","brown rice","roti","chickpeas","chicken","mackerel","okra","cabbage"],["Filipino","Southeast Asia","garlic and black pepper","brown rice","pandesal","mung beans","chicken","milkfish","cabbage","green beans"],["Mexican","North America","ancho chilli and cumin","brown rice","corn tortilla","black beans","chicken","white fish","pepper","courgette"],["Peruvian","South America","aji amarillo and cumin","quinoa","wholegrain bread","lima beans","chicken","white fish","pepper","potato"],["Brazilian","South America","paprika and lime","brown rice","cassava flatbread","black beans","chicken","white fish","collard greens","pumpkin"],["Caribbean","Caribbean","allspice and thyme","brown rice","flatbread","pigeon peas","chicken","snapper","plantain","pumpkin"],["Jamaican","Caribbean","jerk spice and thyme","brown rice","flatbread","kidney beans","chicken","snapper","plantain","pumpkin"],["Cuban","Caribbean","cumin and oregano","brown rice","wholegrain bread","black beans","chicken","snapper","plantain","pepper"],["Australian","Oceania","lemon myrtle and pepper","barley","wholegrain bread","chickpeas","chicken","barramundi","pumpkin","spinach"]];
  const ARCHETYPES = [["breakfast","skillet","egg","Egg and Vegetable Skillet"],["breakfast","griddle","legume","Legume Flatbread Breakfast"],["breakfast","simmered","chicken","Savory Chicken Porridge"],["breakfast","pan-fried","fish","Fish Breakfast Cakes"],["lunch","roasted","chicken","Roasted Chicken Grain Bowl"],["lunch","simmered","legume","Legume Vegetable Soup"],["lunch","griddle","chicken","Chicken-Stuffed Flatbread"],["lunch","poached","fish","Warm Fish Grain Salad"],["lunch","pan-fried","legume","Crisp Legume Patties"],["lunch","stir-fry","beef","Beef Noodle Bowl"],["dinner","one-pot","chicken","One-Pot Chicken Pilaf"],["dinner","slow-simmer","beef","Slow-Cooked Beef Stew"],["dinner","baked","fish","Spice-Baked Fish"],["dinner","grilled","beef","Herbed Beef Kofta"],["dinner","baked","chicken","Chicken-Stuffed Vegetables"],["dinner","simmered","legume","Creamy Legume Curry"],["dinner","roasted","chicken","Chicken Tray Bake"],["dinner","braised","beef","Beef Meatballs"],["snack","pan-fried","legume","Vegetable Legume Fritters"],["snack","no-cook","legume","Chickpea Yogurt Cups"]];

  function slug(value) {
    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function title(value) {
    return String(value).replace(/\b\w/g, (char) => char.toUpperCase());
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

  function makeRecipe(profile, archetype, index) {
    const [
      cuisine,
      region,
      spice,
      grainBase,
      bread,
      legume,
      chicken,
      fish,
      vegetableA,
      vegetableB,
    ] = profile;
    const [mealType, method, proteinType, label] = archetype;

    const mainByType = {
      egg: "eggs",
      legume,
      chicken,
      beef: "lean beef",
      fish,
    };
    const main = mainByType[proteinType];
    const grain = index % 3 === 0 ? grainBase : index % 3 === 1 ? bread : "wholegrain noodles";
    const grainUnit = index % 3 === 1 ? "count" : "g";
    const grainQuantity = index % 3 === 1 ? 4 : 280;
    const grainCategory = index % 3 === 1 ? "Bakery" : "Dry goods";
    const mainCategory =
      proteinType === "legume"
        ? "Canned foods"
        : proteinType === "egg"
          ? "Dairy & alternatives"
          : "Meat, fish & alternatives";
    const mainQuantity = proteinType === "egg" ? 6 : proteinType === "legume" ? 500 : 600;
    const mainUnit = proteinType === "egg" ? "count" : "g";

    const ingredients = [
      ingredient(title(main), mainQuantity, mainUnit, mainCategory),
      ingredient(title(grain), grainQuantity, grainUnit, grainCategory),
      ingredient(title(vegetableA), 280, "g", "Produce"),
      ingredient(title(vegetableB), 220, "g", "Produce"),
      ingredient(title(`${cuisine} ${spice} blend`), 12, "g", "Spices & condiments"),
      ingredient("Cooking oil", 25, "ml", "Spices & condiments"),
    ];

    if (mealType === "snack" && method === "no-cook") {
      ingredients.push(ingredient("Plain yogurt", 180, "g", "Dairy & alternatives"));
    }

    const instructions = [
      `Prepare the ${grain} and cut the ${vegetableA} and ${vegetableB} evenly.`,
      `Season the ${main} with ${spice} and the ${cuisine} spice blend.`,
      `Use the ${method} method until the main ingredient is fully cooked and the vegetables are tender.`,
      `Combine the components, adjust seasoning, and serve ${mealType === "snack" ? "in practical portions" : "hot"}.`,
    ];

    const protein = { egg: 20, legume: 22, chicken: 32, beef: 30, fish: 28 }[proteinType];
    const diets = ["balanced"];
    if (proteinType === "egg" || proteinType === "legume") diets.push("vegetarian");
    if (proteinType === "legume" && !(mealType === "snack" && method === "no-cook")) diets.push("vegan");
    if (protein >= 24) diets.push("high-protein");

    const allergens = [];
    if (proteinType === "egg") allergens.push("egg");
    if (mealType === "snack" && method === "no-cook") allergens.push("milk");

    const category =
      mealType === "breakfast"
        ? "Breakfast"
        : mealType === "lunch"
          ? "Lunch"
          : mealType === "snack"
            ? "Snack"
            : "Main dish";

    return {
      id: `exp-${slug(cuisine)}-${index}`,
      name: `${cuisine} ${label}`,
      mealType,
      cuisine,
      region,
      authenticity: "inspired",
      category,
      description: `A distinct ${cuisine}-centred recipe using ${spice}, ${vegetableA}, ${vegetableB}, and ${grain}.`,
      servings: mealType === "breakfast" ? 2 : 4,
      activeTime: 12 + (index % 5) * 4,
      totalTime: 25 + (index % 6) * 8,
      difficulty: index % 5 === 4 ? "medium" : "easy",
      batchFriendly: ["one-pot", "slow-simmer", "simmered", "braised"].includes(method),
      freezerFriendly: ["slow-simmer", "simmered", "braised"].includes(method),
      diets,
      allergens,
      equipment: [
        ["baked", "roasted"].includes(method) ? "oven tray" : "large pan",
        "knife",
        "cutting board",
      ],
      primaryProtein: proteinType,
      method,
      completeness: 90,
      nutrition: {
        kcal: 390 + (index % 6) * 35,
        protein,
        carbs: 42 + (index % 5) * 6,
        fat: 10 + (index % 4) * 3,
        fibre: 6 + (index % 4) * 2,
        iron: 3 + (index % 3),
        calcium: 90 + (index % 4) * 35,
        vitaminC: 28 + (index % 5) * 8,
      },
      ingredients,
      instructions,
    };
  }

  const expandedRecipes = [];
  PROFILES.forEach((profile) => {
    ARCHETYPES.forEach((archetype, index) => {
      expandedRecipes.push(makeRecipe(profile, archetype, index));
    });
  });

  const ids = new Set(expandedRecipes.map((recipe) => recipe.id));
  const fingerprints = new Set(
    expandedRecipes.map((recipe) =>
      [
        recipe.cuisine,
        recipe.mealType,
        recipe.method,
        recipe.primaryProtein,
        recipe.ingredients.map((item) => item.foodId).sort().join("|"),
        recipe.instructions.join("|"),
      ].join("::"),
    ),
  );

  if (expandedRecipes.length !== 1000) {
    throw new Error(`Expected 1000 expanded recipes, found ${expandedRecipes.length}`);
  }
  if (ids.size !== expandedRecipes.length) {
    throw new Error("Expanded recipe IDs must be unique");
  }
  if (fingerprints.size !== expandedRecipes.length) {
    throw new Error("Expanded recipes must have unique structural fingerprints");
  }
  if (
    expandedRecipes.some(
      (recipe) =>
        !Array.isArray(recipe.equipment) ||
        recipe.equipment.some((item) => typeof item !== "string"),
    )
  ) {
    throw new Error("Every recipe equipment field must be a flat string array");
  }

  const existing = Array.isArray(root.MEAL_PLANNER_RECIPES)
    ? root.MEAL_PLANNER_RECIPES
    : [];
  root.MEAL_PLANNER_RECIPES = [...existing, ...expandedRecipes];

  if (root.MEAL_PLANNER_RECIPES.length !== existing.length + 1000) {
    throw new Error("Expanded recipes were not appended correctly");
  }
  if (
    new Set(root.MEAL_PLANNER_RECIPES.map((recipe) => recipe.id)).size !==
    root.MEAL_PLANNER_RECIPES.length
  ) {
    throw new Error("Merged recipe IDs must be unique");
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
