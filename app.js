const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const RECIPES=[
 {id:"oats",name:"Yogurt overnight oats",type:"breakfast",diet:["balanced","vegetarian","high-protein"],kcal:430,ingredients:{"Oats":"80 g","Greek yogurt":"1 tub","Bananas":"1","Milk":"150 ml"}},
 {id:"eggs",name:"Eggs, toast and tomato",type:"breakfast",diet:["balanced","vegetarian","high-protein"],kcal:470,ingredients:{"Eggs":"2","Wholegrain bread":"2 slices","Tomatoes":"1","Olive oil":"1 tsp"}},
 {id:"chickenRice",name:"Paprika chicken rice bowl",type:"main",diet:["balanced","high-protein"],kcal:690,ingredients:{"Chicken breast":"180 g","Basmati rice":"90 g","Frozen mixed vegetables":"200 g","Paprika":"1 tsp","Olive oil":"1 tbsp"}},
 {id:"lentil",name:"Spanish-style lentil stew",type:"main",diet:["balanced","vegetarian"],kcal:610,ingredients:{"Red lentils":"100 g","Tomatoes":"2","Carrots":"1","Onions":"1","Potatoes":"200 g","Olive oil":"1 tbsp"}},
 {id:"pasta",name:"Tomato tuna pasta",type:"main",diet:["balanced","high-protein"],kcal:720,ingredients:{"Pasta":"100 g","Tinned tuna":"1 can","Tomato passata":"200 g","Onions":"0.5","Olive oil":"1 tbsp"}},
 {id:"vegPasta",name:"Creamy vegetable pasta",type:"main",diet:["vegetarian"],kcal:680,ingredients:{"Pasta":"100 g","Frozen mixed vegetables":"220 g","Cooking cream":"80 ml","Garlic":"1 clove"}},
 {id:"salmon",name:"Oven salmon with potatoes",type:"main",diet:["balanced","high-protein"],kcal:740,ingredients:{"Salmon fillet":"180 g","Potatoes":"300 g","Green beans":"150 g","Olive oil":"1 tbsp"}},
 {id:"chickpea",name:"Chickpea vegetable curry",type:"main",diet:["balanced","vegetarian"],kcal:650,ingredients:{"Chickpeas":"1 can","Basmati rice":"80 g","Coconut milk":"120 ml","Frozen mixed vegetables":"180 g","Curry powder":"1 tbsp"}},
 {id:"wrap",name:"Chicken salad wraps",type:"main",diet:["balanced","high-protein"],kcal:620,ingredients:{"Chicken breast":"150 g","Tortilla wraps":"2","Lettuce":"80 g","Tomatoes":"1","Greek yogurt":"0.5 tub"}},
 {id:"vegWrap",name:"Hummus vegetable wraps",type:"main",diet:["vegetarian"],kcal:590,ingredients:{"Tortilla wraps":"2","Hummus":"80 g","Lettuce":"80 g","Tomatoes":"1","Carrots":"1"}},
 {id:"snack",name:"Fruit and yogurt",type:"snack",diet:["balanced","vegetarian","high-protein"],kcal:220,ingredients:{"Greek yogurt":"1 tub","Seasonal fruit":"1"}}
];
const BASE_PANTRY=["Olive oil","Salt","Black pepper","Paprika","Curry powder","Garlic","Onions"];
const STORAGE_KEY="pamplonaPantryV2";
const el=id=>document.getElementById(id);
let state=loadState();

function defaults(){return {people:2,target:2100,diet:"balanced",pantry:[...BASE_PANTRY],checkedPantry:[],bought:[],removed:[],quantityEdits:{},customShopping:[],plan:[]}}
function loadState(){try{return {...defaults(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}}catch{return defaults()}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function bind(){
 el("generateBtn").onclick=()=>generatePlan(true);el("printBtn").onclick=()=>window.print();
 el("resetBtn").onclick=()=>{localStorage.removeItem(STORAGE_KEY);history.replaceState(null,"",location.pathname);location.reload()};
 el("addPantryBtn").onclick=addPantry;el("customPantryInput").addEventListener("keydown",e=>{if(e.key==="Enter")addPantry()});
 el("sharePantryBtn").onclick=sharePantry;el("clearPantryBtn").onclick=()=>{state.checkedPantry=[];save();renderAll()};
 el("addShoppingBtn").onclick=addShopping;el("customShoppingName").addEventListener("keydown",e=>{if(e.key==="Enter")addShopping()});
}
function hydrateControls(){el("peopleInput").value=state.people;el("calorieTargetInput").value=state.target;el("dietInput").value=state.diet}
function init(){importSharedPantry();bind();hydrateControls();generatePlan(false)}
function generatePlan(read=true){
 if(read){state.people=+el("peopleInput").value;state.target=+el("calorieTargetInput").value;state.diet=el("dietInput").value;state.removed=[];state.quantityEdits={};state.bought=[]}
 const mains=RECIPES.filter(r=>r.type==="main"&&r.diet.includes(state.diet));const breakfasts=RECIPES.filter(r=>r.type==="breakfast"&&r.diet.includes(state.diet));
 state.plan=DAYS.map((day,i)=>({day,breakfast:breakfast[i%breakfast.length],lunch:mains[i%mains.length],dinner:mains[(i+3)%mains.length],snack:RECIPES.find(r=>r.id==="snack")}));save();renderAll();
}
function renderAll(){renderPlan();renderPantry();renderShopping()}
function renderPlan(){let weekly=0;el("mealPlan").innerHTML=state.plan.map(d=>{const total=d.breakfast.kcal+d.lunch.kcal+d.dinner.kcal+d.snack.kcal;weekly+=total;return `<article class="day-card"><h3>${d.day}</h3>${mealHTML("Breakfast",d.breakfast)}${mealHTML("Lunch",d.lunch)}${mealHTML("Dinner",d.dinner)}${mealHTML("Snack",d.snack)}<div class="daily-total">${total.toLocaleString()} kcal / person</div></article>`}).join("");const avg=Math.round(weekly/7);el("weekSummary").textContent=`Average ${avg.toLocaleString()} kcal per person/day · target ${state.target.toLocaleString()} kcal`}
function mealHTML(label,r){return `<div class="meal"><small>${label}</small><strong>${r.name}</strong><span class="kcal">${r.kcal} kcal</span></div>`}
function ingredientNames(){return [...new Set(state.plan.flatMap(d=>[d.breakfast,d.lunch,d.dinner,d.snack]).flatMap(r=>Object.keys(r.ingredients)))].sort()}
function renderPantry(){const all=[...new Set([...state.pantry,...ingredientNames()])].sort();el("pantryList").innerHTML=all.map(item=>`<label class="check-row"><input type="checkbox" ${state.checkedPantry.includes(item)?"checked":""} onchange="togglePantry('${esc(item)}')"><span>${item}</span></label>`).join("")}
window.togglePantry=item=>{item=unesc(item);state.checkedPantry=state.checkedPantry.includes(item)?state.checkedPantry.filter(x=>x!==item):[...state.checkedPantry,item];save();renderShopping()}
function addPantry(){const v=el("customPantryInput").value.trim();if(!v)return;if(!state.pantry.includes(v))state.pantry.push(v);state.checkedPantry=[...new Set([...state.checkedPantry,v])];el("customPantryInput").value="";save();renderAll()}
function shoppingData(){const map={};state.plan.forEach(d=>[d.breakfast,d.lunch,d.dinner,d.snack].forEach(r=>Object.entries(r.ingredients).forEach(([name,qty])=>{map[name]??={name,uses:0,examples:new Set()};map[name].uses++;map[name].examples.add(qty)})));return Object.values(map).filter(x=>!state.checkedPantry.includes(x.name)&&!state.removed.includes(x.name)).sort((a,b)=>a.name.localeCompare(b.name))}
function defaultQty(x){const examples=[...x.examples];const people=state.people;return `${examples.join(" / ")} × ${people} ${people===1?"person":"people"}`}
function renderShopping(){
 const generated=shoppingData().map(x=>({...x,quantity:state.quantityEdits[x.name]||defaultQty(x),custom:false}));
 const custom=state.customShopping.map(x=>({...x,uses:0,custom:true}));const data=[...generated,...custom];
 el("shoppingList").innerHTML=data.map(x=>{const key=x.custom?`custom:${x.id}`:x.name;const done=state.bought.includes(key);return `<div class="shopping-row ${done?"done":""}"><input class="buy-check" type="checkbox" ${done?"checked":""} onchange="toggleBought('${esc(key)}')"><div class="shopping-copy"><strong>${x.name}</strong>${x.custom?"":`<span class="muted">Used in ${x.uses} meals</span>`}</div><input class="qty-input" value="${attr(x.quantity)}" aria-label="Quantity for ${attr(x.name)}" onchange="editQuantity('${esc(key)}',this.value)"><button class="icon-button" title="Remove item" aria-label="Remove ${attr(x.name)}" onclick="removeShopping('${esc(key)}')">×</button></div>`}).join("")||`<p class="muted">Everything required is already marked as available.</p>`;
 el("shoppingCount").textContent=`${data.length} ${data.length===1?"item":"items"}`
}
window.toggleBought=key=>{key=unesc(key);state.bought=state.bought.includes(key)?state.bought.filter(x=>x!==key):[...state.bought,key];save();renderShopping()}
window.editQuantity=(key,value)=>{key=unesc(key);if(key.startsWith("custom:")){const id=key.slice(7);const item=state.customShopping.find(x=>x.id===id);if(item)item.quantity=value}else state.quantityEdits[key]=value;save()}
window.removeShopping=key=>{key=unesc(key);if(key.startsWith("custom:"))state.customShopping=state.customShopping.filter(x=>x.id!==key.slice(7));else state.removed=[...new Set([...state.removed,key])];state.bought=state.bought.filter(x=>x!==key);save();renderShopping()}
function addShopping(){const name=el("customShoppingName").value.trim();if(!name)return;const quantity=el("customShoppingQty").value.trim()||"As needed";state.customShopping.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,quantity});el("customShoppingName").value="";el("customShoppingQty").value="";save();renderShopping()}
function pantryPayload(){return btoa(unescape(encodeURIComponent(JSON.stringify({pantry:state.pantry,checked:state.checkedPantry}))))}
function importSharedPantry(){if(!location.hash.startsWith("#pantry="))return;try{const data=JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(8)))));state.pantry=[...new Set([...state.pantry,...(data.pantry||[])])];state.checkedPantry=[...new Set(data.checked||[])];save();setTimeout(()=>setStatus("Shared pantry loaded."),0)}catch{setTimeout(()=>setStatus("This pantry link could not be read."),0)}}
async function sharePantry(){const url=`${location.origin}${location.pathname}#pantry=${pantryPayload()}`;const text=`My pantry list (${state.checkedPantry.length} items marked available)`;try{if(navigator.share){await navigator.share({title:"Shared pantry",text,url});setStatus("Pantry shared.")}else{await navigator.clipboard.writeText(url);setStatus("Share link copied to clipboard.")}}catch(err){if(err.name!=="AbortError"){prompt("Copy this pantry link:",url);setStatus("Share link ready.")}}}
function setStatus(message){const node=el("shareStatus");if(node)node.textContent=message}
function esc(s){return String(s).replaceAll("'","&#39;")}function unesc(s){return String(s).replaceAll("&#39;","'")}function attr(s){return String(s).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
init();
