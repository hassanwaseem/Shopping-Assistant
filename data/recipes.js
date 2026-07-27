(function (root, factory) {
  const recipes = factory();
  if (typeof module === "object" && module.exports) module.exports = recipes;
  root.MEAL_PLANNER_RECIPES = recipes;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PROFILES = globalThis.__MEAL_PLANNER_RECIPE_PROFILES || [];
  const TEMPLATES = [
    ["breakfast","egg","{cuisine}-Inspired {spice} Egg and {veg} Skillet"],
    ["breakfast","bread","{cuisine}-Inspired {legume} {bread} Breakfast"],
    ["breakfast","porridge","{cuisine}-Inspired Savory {grain} Porridge"],
    ["breakfast","salad","{cuisine}-Inspired {fruit} Grain Breakfast Bowl"],
    ["lunch","legume","{cuisine}-Inspired {legume} and {veg} Bowl"],
    ["lunch","soup","{cuisine}-Inspired {veg} and {legume} Soup"],
    ["lunch","salad","{cuisine}-Inspired Roasted {veg} {grain} Salad"],
    ["lunch","bread","{cuisine}-Inspired {protein} {bread} Wrap"],
    ["lunch","noodle","{cuisine}-Inspired {protein} Noodle Bowl"],
    ["dinner","rice","{cuisine}-Inspired {spice} {protein} with {grain}"],
    ["dinner","stew","{cuisine}-Inspired Slow-Cooked {red} and {veg}"],
    ["dinner","fish","{cuisine}-Inspired {fish} with {veg} and {grain}"],
    ["dinner","legume","{cuisine}-Inspired {legume} and {veg} Stew"],
    ["dinner","bake","{cuisine}-Inspired {protein} and {veg} Tray Bake"],
    ["dinner","stirfry","{cuisine}-Inspired Quick {protein} and {veg} Pan"],
    ["snack","bread","{cuisine}-Inspired {legume} Fritters with {herb} Dip"],
    ["snack","snack","{cuisine}-Inspired {fruit} Oat and Nut Bites"]
  ];

  const N = {
    rice:[365,7.1,80,.7,1.3,1.5,28,0], wholegrain:[360,11,70,3,7,3,40,0], bread:[250,9,49,3,5,3,100,0],
    legume:[130,8.8,23,.8,7,3,35,2], tofu:[145,17,3,9,2,3,350,0], chicken:[180,29,0,7,0,1.3,15,0],
    beef:[250,26,0,17,0,2.6,18,0], lamb:[258,25,0,17,0,1.9,17,0], goat:[143,27,0,3,0,3.7,17,0],
    fish:[160,23,0,7,0,1,30,0], shrimp:[99,24,.2,.3,0,.5,70,0], egg:[143,13,.7,9.5,0,1.8,56,0],
    yogurt:[73,9.5,4,2,0,.1,110,0], cheese:[300,20,3,24,0,.7,500,0], oil:[884,0,0,100,0,0,0,0],
    tomato:[18,.9,3.9,.2,1.2,.3,10,14], onion:[40,1.1,9.3,.1,1.7,.2,23,7], garlic:[149,6.4,33,.5,2.1,1.7,181,31],
    veg:[30,2,6,.3,2.5,.7,45,45], fruit:[60,.7,15,.2,2.4,.3,15,35], herb:[36,3,6,.8,3,2,120,80],
    spice:[250,10,45,10,25,12,200,10], nuts:[600,20,20,52,9,3.5,120,1], seeds:[560,22,20,45,12,7,250,1],
    stock:[8,1,.5,.2,0,.1,5,0], sauce:[53,8,4.9,.6,.8,1.5,33,0], vinegar:[18,0,.7,0,0,0,7,0]
  };

  function slug(value) {
    return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function title(value) { return String(value).replace(/\b\w/g, (char) => char.toUpperCase()); }
  function keyFor(name) {
    const s=String(name).toLowerCase();
    if (/shrimp|prawn/.test(s)) return "shrimp";
    if (/fish|tuna|salmon|cod|hake|trout|herring|sardine|tilapia|mackerel|grouper|bass|bream|kingfish|milkfish/.test(s)) return "fish";
    if (/chicken/.test(s)) return "chicken";
    if (/beef/.test(s)) return "beef";
    if (/lamb/.test(s)) return "lamb";
    if (/goat/.test(s)) return "goat";
    if (/tofu|tempeh/.test(s)) return "tofu";
    if (/egg/.test(s)) return "egg";
    if (/yogurt/.test(s)) return "yogurt";
    if (/paneer|cheese/.test(s)) return "cheese";
    if (/chickpea|lentil|bean|pea|dal|legume|edamame|soybean/.test(s)) return "legume";
    if (/bread|roti|chapati|naan|pita|pide|dosa|injera|canjeero|baguette|ciabatta|tortilla|pancake|bun|khubz|khobz|broa|roosterkoek|pandesal|malawah|tabouna/.test(s)) return "bread";
    if (/rice|couscous|bulgur|pasta|noodle|orzo|barley|buckwheat|quinoa|teff|corn|maize/.test(s)) return "rice";
    if (/oil/.test(s)) return "oil";
    if (/tomato/.test(s)) return "tomato";
    if (/onion/.test(s)) return "onion";
    if (/garlic/.test(s)) return "garlic";
    if (/stock/.test(s)) return "stock";
    if (/soy sauce/.test(s)) return "sauce";
    if (/vinegar/.test(s)) return "vinegar";
    if (/nut/.test(s)) return "nuts";
    if (/seed/.test(s)) return "seeds";
    if (/mango|banana|apricot|pomegranate|date|orange|pineapple|fig|apple|plum|grape|pear|avocado|passionfruit|lemon|lime/.test(s)) return "fruit";
    if (/coriander|parsley|dill|basil|scallion|tarragon|curry leaf|lemongrass|herb/.test(s)) return "herb";
    if (/spinach|okra|eggplant|cabbage|pumpkin|carrot|pepper|zucchini|greens|kale|leek|beetroot|mushroom|broccoli|daikon|cassava|plantain|potato|corn|tomato/.test(s)) return "veg";
    return "spice";
  }
  function categoryFor(key) {
    if (["rice","wholegrain"].includes(key)) return "Dry goods";
    if (key === "bread") return "Bakery";
    if (["legume","tofu"].includes(key)) return "Canned foods";
    if (["chicken","beef","lamb","goat","fish","shrimp"].includes(key)) return "Meat, fish & alternatives";
    if (["egg","yogurt","cheese"].includes(key)) return "Dairy & alternatives";
    if (["oil","spice","nuts","seeds","stock","sauce","vinegar"].includes(key)) return "Spices & condiments";
    return "Produce";
  }
  function ingredient(name, quantity, unit="g", key=null, optional=false) {
    const nutrientKey=key || keyFor(name);
    return {id:slug(name),foodId:slug(name),name,quantity,unit,category:categoryFor(nutrientKey),optional,_key:nutrientKey};
  }
  function amountG(item) {
    if (item.unit === "g" || item.unit === "ml") return Number(item.quantity);
    const weights={egg:50,onion:110,garlic:5,fruit:150,veg:120};
    return Number(item.quantity) * (weights[item._key] || 100);
  }
  function nutrition(items, servings) {
    const totals=[0,0,0,0,0,0,0,0];
    for (const item of items) {
      const values=N[item._key] || N.spice;
      const factor=amountG(item)/100;
      values.forEach((value,index)=>{totals[index]+=value*factor;});
    }
    const values=totals.map((value)=>Math.round((value/servings)*10)/10);
    return {kcal:Math.round(values[0]),protein:values[1],carbs:values[2],fat:values[3],fibre:values[4],iron:values[5],calcium:Math.round(values[6]),vitaminC:Math.round(values[7])};
  }
  function common(profile) {
    return [ingredient("Onions",2,"count","onion"),ingredient("Garlic",4,"count","garlic"),ingredient(title(profile.spice),12,"g","spice"),ingredient("Cooking oil",25,"ml","oil")];
  }
  function makeRecipe(profile,name,mealType,kind,index,authenticity) {
    let servings=mealType === "breakfast" ? 2 : 4;
    const veg=profile.veg[index%profile.veg.length], veg2=profile.veg[(index+1)%profile.veg.length];
    const {grain,bread,legume,herb,protein,red,fish}=profile;
    let items=[],instructions=[],method="stovetop",batchFriendly=false,freezerFriendly=false,difficulty="easy",activeTime=20,totalTime=35,category="Main dish";
    if (["rice","grain"].includes(kind)) {
      items=[ingredient(title(grain),320),ingredient(title(protein),600),ingredient(title(veg),300),...common(profile)];
      instructions=[`Rinse the ${grain} until the water runs mostly clear.`,`Warm the oil in a wide pot and soften the onions for 6–8 minutes; add garlic and ${profile.spice}.`,`Add the ${protein} and cook until lightly browned on all sides.`,`Stir in the ${veg}, ${grain}, and 700 ml water or stock. Cover and cook gently until the grain is tender and the protein is cooked through.`,`Rest for 5 minutes, fluff, and finish with chopped ${herb}.`];
      method="one-pot";batchFriendly=true;freezerFriendly=true;activeTime=25;totalTime=55;category="Rice and grain dish";
    } else if (kind === "legume") {
      items=[ingredient(title(legume),600),ingredient(title(grain),280),ingredient(title(veg),300),ingredient("Tomatoes",400,"g","tomato"),...common(profile)];
      instructions=[`Rinse the ${grain} and cook it separately until tender.`,`Soften the onions in oil, then add garlic and ${profile.spice}.`,`Add tomatoes and cook until slightly reduced.`,`Stir in the ${legume} and ${veg}; add a splash of water and simmer for 18–22 minutes.`,`Serve with the ${grain} and fresh ${herb}.`];
      method="simmered";batchFriendly=true;freezerFriendly=true;activeTime=20;totalTime=40;category="Legume dish";
    } else if (["stew","curry"].includes(kind)) {
      const main=index%2?red:protein;
      items=[ingredient(title(main),650),ingredient(title(veg),350),ingredient("Tomatoes",400,"g","tomato"),...common(profile),ingredient("Plain yogurt",120,"g","yogurt",true)];
      instructions=[`Pat the ${main} dry and season lightly.`,`Brown it in half the oil, then transfer to a plate.`,`Soften onions, add garlic and ${profile.spice}, and cook for 1 minute.`,`Return the ${main}; add tomatoes, ${veg}, and 400 ml water or stock. Cover and simmer until tender.`,`Stir in yogurt if using, check seasoning, and finish with ${herb}.`];
      method="slow-simmer";batchFriendly=true;freezerFriendly=true;activeTime=25;totalTime=70;difficulty="medium";category="Stew and curry";
    } else if (kind === "dairy") {
      items=[ingredient("Paneer or firm fresh cheese",500,"g","cheese"),ingredient(title(veg),450),ingredient(title(grain),280),ingredient("Tomatoes",300,"g","tomato"),...common(profile)];
      instructions=[`Cook the ${grain} and keep warm.`,`Soften onions and garlic in the oil, then add ${profile.spice}.`,`Add tomatoes and ${veg}; cook until the vegetables are tender.`,`Fold in cubes of cheese and simmer gently for 5–7 minutes.`,`Serve with the ${grain} and finish with ${herb}.`];
      method="simmered";activeTime=22;totalTime=38;category="Vegetarian main";
    } else if (kind === "fish") {
      items=[ingredient(title(fish),600),ingredient(title(grain),280),ingredient(title(veg),350),ingredient("Lemon",1,"count","fruit"),...common(profile)];
      instructions=[`Cook the ${grain} until tender and keep warm.`,`Mix half the oil with ${profile.spice}, garlic, and lemon juice.`,`Coat the ${fish} with the mixture and leave for 10 minutes.`,`Cook the fish in a covered pan or 200°C oven until it flakes easily; cook the ${veg} alongside until tender.`,`Serve over the ${grain} with ${herb}.`];
      method="baked";activeTime=20;totalTime=40;category="Fish and seafood";
    } else if (kind === "bread") {
      items=[ingredient(title(bread),4,"count"),ingredient(title(legume),400),ingredient(title(veg),250),ingredient("Plain yogurt",160,"g","yogurt",true),...common(profile)];
      instructions=[`Warm the ${bread} according to its package or recipe.`,`Soften onions and garlic in oil, then add ${profile.spice}.`,`Add the ${legume} and ${veg}; cook until the vegetables are tender and the mixture is fairly dry.`,`Spoon the filling into or over the ${bread}.`,`Finish with ${herb} and yogurt if using.`];
      method="griddle";activeTime=20;totalTime=30;category="Flatbread and wrap";
    } else if (kind === "egg") {
      items=[ingredient("Eggs",6,"count","egg"),ingredient(title(veg),260),ingredient("Tomatoes",250,"g","tomato"),ingredient(title(bread),4,"count"),...common(profile)];
      instructions=[`Soften onions and ${veg} in the oil.`,`Add garlic, tomatoes, and ${profile.spice}; cook until thickened.`,`Make small wells and crack in the eggs.`,`Cover and cook until the whites are set but the yolks remain as desired.`,`Serve with warm ${bread} and ${herb}.`];
      method="skillet";activeTime=18;totalTime=25;category="Egg breakfast";
    } else if (kind === "porridge") {
      items=[ingredient(title(grain),160),ingredient(title(protein),250),ingredient(title(veg),180),ingredient("Stock",650,"ml","stock"),...common(profile)];
      instructions=[`Rinse the ${grain}.`,`Soften onion and garlic with ${profile.spice}.`,`Add the ${protein}, ${grain}, ${veg}, and stock.`,`Simmer, stirring occasionally, until soft and spoonable and the protein is fully cooked.`,`Finish with ${herb}.`];
      method="simmered";batchFriendly=true;activeTime=18;totalTime=45;category="Savory porridge";
    } else if (kind === "salad") {
      items=[ingredient(title(grain),240),ingredient(title(legume),350),ingredient(title(veg),250),ingredient(title(veg2),200),ingredient("Lemon",1,"count","fruit"),ingredient("Olive oil",30,"ml","oil"),ingredient(title(herb),30,"g","herb")];
      instructions=[`Cook the ${grain}, drain well, and cool for 10 minutes.`,`Rinse and drain the ${legume}.`,`Chop the ${veg}, ${veg2}, and ${herb}.`,`Whisk lemon juice with olive oil and a pinch of ${profile.spice}.`,`Toss everything together and serve at room temperature.`];
      method="no-cook";activeTime=18;totalTime=30;category="Salad";
    } else if (kind === "soup") {
      items=[ingredient(title(legume),450),ingredient(title(veg),300),ingredient(title(veg2),250),ingredient("Stock",900,"ml","stock"),...common(profile)];
      instructions=[`Soften onions and garlic in oil.`,`Add ${profile.spice} and stir for 30 seconds.`,`Add the ${legume}, ${veg}, ${veg2}, and stock.`,`Simmer until the vegetables are tender; blend part of the soup if a thicker texture is preferred.`,`Finish with ${herb} and serve.`];
      method="simmered";batchFriendly=true;freezerFriendly=true;activeTime=15;totalTime=40;category="Soup";
    } else if (kind === "bake") {
      items=[ingredient(title(protein),650),ingredient(title(veg),350),ingredient(title(veg2),300),ingredient(title(grain),260),...common(profile)];
      instructions=[`Heat the oven to 200°C.`,`Cook the ${grain} until just tender.`,`Toss the ${protein}, ${veg}, and ${veg2} with oil, garlic, and ${profile.spice}.`,`Roast for 25–35 minutes, turning once, until the protein is cooked and the vegetables are browned.`,`Serve with the ${grain} and ${herb}.`];
      method="baked";activeTime=15;totalTime=50;batchFriendly=true;category="Tray bake";
    } else if (kind === "stirfry") {
      items=[ingredient(title(protein),550),ingredient(title(grain),280),ingredient(title(veg),300),ingredient(title(veg2),250),ingredient("Soy sauce",35,"ml","sauce"),ingredient("Rice vinegar",15,"ml","vinegar"),...common(profile)];
      instructions=[`Cook the ${grain} and keep warm.`,`Slice the ${protein} and vegetables into even pieces.`,`Heat the oil in a wok or large pan and cook the ${protein} until nearly done.`,`Add ${veg}, ${veg2}, garlic, ${profile.spice}, soy sauce, and vinegar; stir-fry until crisp-tender.`,`Serve over the ${grain} with ${herb}.`];
      method="stir-fry";activeTime=20;totalTime=30;category="Stir-fry";
    } else if (kind === "noodle") {
      items=[ingredient("Noodles",320,"g","rice"),ingredient(title(protein),500),ingredient(title(veg),300),ingredient(title(veg2),220),ingredient("Soy sauce",35,"ml","sauce"),...common(profile)];
      instructions=[`Cook the noodles until just tender, then drain.`,`Slice the ${protein} and vegetables.`,`Cook the ${protein} in hot oil until almost done.`,`Add vegetables, garlic, ${profile.spice}, and soy sauce; toss in the noodles.`,`Cook for 2 minutes more and finish with ${herb}.`];
      method="stir-fry";activeTime=22;totalTime=32;category="Noodle dish";
    } else if (kind === "tofu") {
      items=[ingredient("Firm tofu",500,"g","tofu"),ingredient("Beef mince",250,"g","beef"),ingredient(title(grain),280),ingredient(title(veg),250),ingredient("Soy sauce",35,"ml","sauce"),...common(profile)];
      instructions=[`Cook the ${grain}.`,`Brown the beef with onion, garlic, and ${profile.spice}.`,`Add the ${veg} and soy sauce.`,`Fold in cubed tofu and simmer gently for 8–10 minutes so it absorbs the sauce.`,`Serve over the ${grain} with ${herb}.`];
      method="simmered";activeTime=22;totalTime=35;category="Tofu dish";
    } else if (kind === "snack") {
      items=[ingredient(title(profile.fruit),300,"g","fruit"),ingredient("Rolled oats",120,"g","rice"),ingredient("Mixed nuts",80,"g","nuts"),ingredient("Mixed seeds",35,"g","seeds"),ingredient("Plain yogurt",180,"g","yogurt"),ingredient(title(profile.spice),4,"g","spice")];
      instructions=[`Finely chop or grate the ${profile.fruit}.`,`Toast the oats, nuts, and seeds in a dry pan for 3–4 minutes.`,`Mix the toasted ingredients with the ${profile.fruit}, yogurt, and a small pinch of ${profile.spice}.`,`Chill the mixture for 15 minutes, then shape into small portions or spoon into cups.`,`Keep chilled until serving.`];
      method="no-cook";activeTime=12;totalTime=30;category="Snack";servings=4;
    }
    const keys=new Set(items.map((item)=>item._key));
    const allergenMap={bread:"gluten",yogurt:"milk",cheese:"milk",egg:"egg",nuts:"nuts",seeds:"sesame",tofu:"soy",sauce:"soy",fish:"fish",shrimp:"shellfish"};
    const allergens=[...new Set([...keys].map((key)=>allergenMap[key]).filter(Boolean))].sort();
    const animal=["chicken","beef","lamb","goat","fish","shrimp"].some((key)=>keys.has(key));
    const dairyEgg=["egg","yogurt","cheese"].some((key)=>keys.has(key));
    const nutrients=nutrition(items,servings);
    const diets=["balanced"];
    if (!animal) { diets.push("vegetarian"); if (!dairyEgg) diets.push("vegan"); }
    if (nutrients.protein >= 24) diets.push("high-protein");
    const primaryProtein=["chicken","beef","lamb","goat","fish","shrimp","tofu","legume","egg"].find((key)=>keys.has(key)) || "mixed";
    items.forEach((item)=>delete item._key);
    return {id:slug(`${profile.cuisine}-${name}`),name,mealType,cuisine:profile.cuisine,region:profile.region,authenticity,category,
      description:`A practical ${profile.cuisine} ${authenticity === "traditional" ? "home-style" : "inspired"} recipe built around ${profile.spice}, ${veg}, and ${grain}.`,
      servings,activeTime,totalTime,difficulty,batchFriendly,freezerFriendly,diets,allergens,equipment:[method === "baked" ? "oven tray" : "large pan","knife","cutting board"],
      primaryProtein,method,completeness:90,nutrition:nutrients,ingredients:items,instructions};
  }
  function generatedName(profile,template,index) {
    const veg=profile.veg[index%profile.veg.length];
    const values={cuisine:profile.cuisine,spice:title(profile.spice),veg:title(veg),legume:title(profile.legume),bread:title(profile.bread),fruit:title(profile.fruit),grain:title(profile.grain),protein:title(profile.protein),red:title(profile.red),fish:title(profile.fish),herb:title(profile.herb)};
    return template.replace(/\{([a-z]+)\}/g,(_,key)=>values[key] || "");
  }
  const recipes=[];
  PROFILES.forEach((profile,profileIndex)=>{
    profile.canonical.forEach(([name,meal,kind],index)=>recipes.push(makeRecipe(profile,name,meal,kind,index,"traditional")));
    const targets=profile.counts === 16 ? {breakfast:4,lunch:5,dinner:5,snack:2} : profile.counts === 13 ? {breakfast:3,lunch:4,dinner:5,snack:1} : {breakfast:3,lunch:4,dinner:4,snack:1};
    const existing=Object.fromEntries(Object.keys(targets).map((meal)=>[meal,profile.canonical.filter((row)=>row[1]===meal).length]));
    let generatedIndex=0;
    ["breakfast","lunch","dinner","snack"].forEach((meal)=>{
      const options=TEMPLATES.filter((row)=>row[0]===meal);
      for (let index=0;index<targets[meal]-existing[meal];index+=1) {
        const [,kind,template]=options[(profileIndex+index)%options.length];
        const name=generatedName(profile,template,generatedIndex+profileIndex);
        recipes.push(makeRecipe(profile,name,meal,kind,generatedIndex+10,"inspired"));
        generatedIndex+=1;
      }
    });
  });
  if (recipes.length !== 500) throw new Error(`Expected 500 recipes, found ${recipes.length}`);
  if (new Set(recipes.map((recipe)=>recipe.id)).size !== recipes.length) throw new Error("Recipe IDs must be unique");
  return recipes;
});
