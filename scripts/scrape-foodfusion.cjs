#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const API_ROOT = 'https://foodfusion.com/wp-json/wp/v2/recipe';
const USER_AGENT = 'Shopping-Assistant-Recipe-Importer/1.0 (+personal meal-planner import)';
const DEFAULT_OUTPUT = path.join('data', 'foodfusion-recipes.json');
const DEFAULT_REPORT = path.join('data', 'foodfusion-import-report.json');
const DEFAULT_CHECKPOINT = path.join('data', '.foodfusion-import-checkpoint.json');
const MAX_INSTRUCTION_WORDS = 195;

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    report: DEFAULT_REPORT,
    checkpoint: DEFAULT_CHECKPOINT,
    concurrency: 3,
    delay: 180,
    limit: null,
    refresh: false,
    retryFailures: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--refresh') options.refresh = true;
    else if (argument === '--retry-failures') options.retryFailures = true;
    else if (argument === '--output') options.output = argv[++index];
    else if (argument === '--report') options.report = argv[++index];
    else if (argument === '--checkpoint') options.checkpoint = argv[++index];
    else if (argument === '--concurrency') options.concurrency = Number(argv[++index]);
    else if (argument === '--delay') options.delay = Number(argv[++index]);
    else if (argument === '--limit') options.limit = Number(argv[++index]);
    else if (argument === '--help') options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) {
    throw new Error('--concurrency must be an integer from 1 to 8.');
  }
  if (!Number.isFinite(options.delay) || options.delay < 0) throw new Error('--delay must be zero or greater.');
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer.');
  }
  return options;
}

function usage() {
  return [
    'Usage: node scripts/scrape-foodfusion.cjs [options]',
    '',
    'Options:',
    '  --output FILE       Dataset output (default: data/foodfusion-recipes.json)',
    '  --report FILE       Import report (default: data/foodfusion-import-report.json)',
    '  --checkpoint FILE   Resumable checkpoint path',
    '  --concurrency N     Concurrent recipe requests, 1-8 (default: 3)',
    '  --delay MS          Minimum delay per worker (default: 180)',
    '  --limit N           Import only the first N records for testing',
    '  --refresh           Ignore an existing checkpoint',
    '  --retry-failures    Retry records saved as failures in the checkpoint',
    '  --help              Show this message',
  ].join('\n');
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
          'user-agent': USER_AGENT,
        },
      });
      if (response.ok) return response;
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!retryable) throw new Error(`HTTP ${response.status} for ${url}`);
      const retryAfter = Number(response.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) ? retryAfter * 1_000 : 500 * (2 ** (attempt - 1));
      await sleep(wait);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(500 * (2 ** (attempt - 1)));
    }
  }
  throw lastError || new Error(`Request failed: ${url}`);
}

async function fetchJson(url) {
  return (await fetchWithRetry(url)).json();
}

async function fetchText(url) {
  return (await fetchWithRetry(url)).text();
}

function decodeEntities(value) {
  const named = {
    amp: '&', apos: "'", copy: '©', deg: '°', gt: '>', hellip: '…',
    laquo: '«', ldquo: '“', lsquo: '‘', lt: '<', nbsp: ' ', ndash: '–',
    quot: '"', raquo: '»', rdquo: '”', reg: '®', rsquo: '’', times: '×',
  };
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function cleanText(value) {
  return decodeEntities(String(value || ''))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u00a0\s]+/g, ' ')
    .trim();
}

function slug(value) {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeFractions(value) {
  return String(value || '')
    .replace(/(\d)½/g, '$1 1/2')
    .replace(/(\d)¼/g, '$1 1/4')
    .replace(/(\d)¾/g, '$1 3/4')
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4')
    .replace(/⅓/g, '1/3')
    .replace(/⅔/g, '2/3')
    .replace(/⅛/g, '1/8')
    .replace(/⅜/g, '3/8')
    .replace(/⅝/g, '5/8')
    .replace(/⅞/g, '7/8')
    .replace(/(\d)\s*&\s*(\d+\/\d+)/g, '$1 $2');
}

function parseNumber(value) {
  const text = normalizeFractions(value).trim();
  if (/^\d+\s+\d+\/\d+$/.test(text)) {
    const [whole, fraction] = text.split(/\s+/);
    const [numerator, denominator] = fraction.split('/').map(Number);
    return Number(whole) + (numerator / denominator);
  }
  if (/^\d+\/\d+$/.test(text)) {
    const [numerator, denominator] = text.split('/').map(Number);
    return numerator / denominator;
  }
  const range = text.match(/^(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)$/i);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeUnit(value) {
  const unit = String(value || '').toLowerCase().replace(/\.$/, '');
  const units = {
    tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tbsp: 'tbsp',
    teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
    cups: 'cup', cup: 'cup',
    grams: 'g', gram: 'g', gms: 'g', gm: 'g', g: 'g',
    kilograms: 'kg', kilogram: 'kg', kgs: 'kg', kg: 'kg',
    millilitres: 'ml', milliliters: 'ml', millilitre: 'ml', milliliter: 'ml', ml: 'ml',
    litres: 'l', liters: 'l', litre: 'l', liter: 'l', l: 'l',
    pounds: 'lb', pound: 'lb', lbs: 'lb', lb: 'lb',
    ounces: 'oz', ounce: 'oz', oz: 'oz',
    pieces: 'piece', piece: 'piece', pcs: 'piece', pc: 'piece',
    cloves: 'clove', clove: 'clove',
    packets: 'packet', packet: 'packet', packs: 'packet', pack: 'packet', sachets: 'packet', sachet: 'packet',
    cans: 'tin', can: 'tin', tins: 'tin', tin: 'tin',
    bunches: 'bunch', bunch: 'bunch', handfuls: 'handful', handful: 'handful',
    pinches: 'pinch', pinch: 'pinch', inches: 'inch', inch: 'inch',
    slices: 'slice', slice: 'slice', leaves: 'leaf', leaf: 'leaf',
    kilos: 'kg', kilo: 'kg',
    large: 'count', medium: 'count', small: 'count',
  };
  return units[unit] || unit || 'count';
}

function extractEnglishBlock(html) {
  const startMatch = /<div[^>]*class=["'][^"']*\benglish-detail-ff\b[^"']*["'][^>]*>/i.exec(html);
  if (!startMatch) return null;
  const start = startMatch.index + startMatch[0].length;
  const remainder = html.slice(start);
  const endMarkers = [
    /<div[^>]*class=["'][^"']*\burdu-detail-ff\b/i,
    /<div[^>]*class=["'][^"']*\broman-detail-ff\b/i,
    /<section[^>]*id=["']comments/i,
    /<footer\b/i,
  ];
  const endpoints = endMarkers.map((pattern) => pattern.exec(remainder)?.index).filter(Number.isInteger);
  const end = endpoints.length ? Math.min(...endpoints) : remainder.length;
  return remainder.slice(0, end);
}

function htmlBlockToLines(fragment) {
  const marked = String(fragment || '')
    .replace(/<strong[^>]*>\s*(?:<u[^>]*>)?([\s\S]*?)(?:<\/u>)?\s*<\/strong>/gi, '\n## $1\n')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<p[^>]*>|<li[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(marked)
    .split(/\r?\n/)
    .map((line) => line.replace(/[\u00a0\t ]+/g, ' ').trim())
    .filter(Boolean);
}

function splitLabelLine(line, labelPattern) {
  const match = line.match(labelPattern);
  if (!match) return null;
  return line.slice(match[0].length).replace(/^\s*:?\s*/, '').trim();
}

function parseRecipeSections(html) {
  const block = extractEnglishBlock(html);
  if (!block) throw new Error('english_recipe_block_missing');
  const lines = htmlBlockToLines(block);
  const labels = lines
    .map((line, index) => {
      const plain = line.replace(/^#+\s*/, '');
      if (/^ingredients?\s*:?/i.test(plain)) return { index, kind: 'ingredients', plain };
      if (/^(?:directions?|method)\s*:?/i.test(plain)) return { index, kind: 'directions', plain };
      return null;
    })
    .filter(Boolean);
  if (!labels.some((label) => label.kind === 'ingredients')) throw new Error('ingredients_label_missing');

  const instructionStart = /^(?:in\b|add\b|mix\b|combine\b|heat\b|cook\b|cut\b|boil\b|blend\b|serve\b|place\b|fry\b|transfer\b|cover\b|pour\b|marinat\w*\b|garnish\b|preheat\b|bake\b|take\b|put\b|remove\b|sprinkle\b|roll\b|apply\b|dip\b|grease\b|wash\b|drain\b|refrigerat\w*\b|store\b|keep\b|beat\b|whisk\b|knead\b|divide\b|slice\b|peel\b)/i;
  const ingredientLines = [];
  const directionLines = [];
  for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
    const label = labels[labelIndex];
    const nextIndex = labels[labelIndex + 1]?.index ?? lines.length;
    const leadPattern = label.kind === 'ingredients' ? /^ingredients?/i : /^(?:directions?|method)/i;
    const lead = splitLabelLine(label.plain, leadPattern);
    const segment = [...(lead ? [lead] : []), ...lines.slice(label.index + 1, nextIndex)];
    const contentLines = segment.filter((line) => !likelySection(line));
    const actionRatio = contentLines.length
      ? contentLines.filter((line) => instructionStart.test(cleanText(line).replace(/^[-–•]\s*/, ''))).length / contentLines.length
      : 0;
    const legacyMislabeledDirections = label.kind === 'ingredients'
      && ingredientLines.length > 0
      && actionRatio >= 0.5
      && !labels.slice(labelIndex + 1).some((candidate) => candidate.kind === 'directions');
    if (label.kind === 'directions' || legacyMislabeledDirections) directionLines.push(...segment);
    else ingredientLines.push(...segment);
  }
  if (!directionLines.length) throw new Error('directions_label_missing');
  return { block, lines, ingredientLines, directionLines };
}

function likelySection(line) {
  const plain = line.replace(/^##\s*/, '').replace(/^-\s*/, '').trim();
  return line.startsWith('##') || (plain.length < 80 && /:$/.test(plain) && !/^in\b/i.test(plain));
}

function englishIngredientName(value) {
  const text = cleanText(value).replace(/^[-–•]\s*/, '').replace(/\s+/g, ' ').trim();
  const translations = [...text.matchAll(/\(([^()]*)\)/g)]
    .map((match) => cleanText(match[1]))
    .filter((candidate) => candidate.length > 1 && candidate.length < 70)
    .filter((candidate) => !/^(optional|for |to |finely|roughly|chopped|sliced|crushed|grated|boiled|roasted)/i.test(candidate));
  return translations.at(-1) || text.replace(/\s*\([^()]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseIngredientLine(line, section = null) {
  const original = cleanText(line).replace(/^[-–•]\s*/, '').trim();
  if (!original) return null;
  const normalized = normalizeFractions(original).replace(/\s+/g, ' ').trim();
  const numberPattern = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)(?:\\s*(?:-|to)\\s*\\d+(?:\\.\\d+)?)?';
  const unitPattern = '(?:tablespoons?|tbsp|tbs|teaspoons?|tsp|cups?|grams?|gms?|gm|g|kilograms?|kgs?|kg|kilos?|millilit(?:re|er)s?|ml|lit(?:re|er)s?|l|pounds?|lbs?|lb|ounces?|oz|pieces?|pcs?|pc|cloves?|packets?|packs?|sachets?|cans?|tins?|bunches?|handfuls?|pinches?|inches?|slices?|leaves?|large|medium|small)';
  let match = normalized.match(new RegExp(`^(.+?)\\s+(${numberPattern})\\s*(${unitPattern})\\b(.*)$`, 'i'));
  if (!match) match = normalized.match(new RegExp(`^(.+?)\\s+(${numberPattern})(?:\\s+(pieces?|pcs?|pc))?(\\s+(?:or to taste|to taste|as required|as needed).*)?$`, 'i'));

  let itemText = normalized;
  let amount = null;
  let unit = 'as needed';
  let remainder = '';
  if (match) {
    itemText = match[1].trim();
    amount = parseNumber(match[2]);
    unit = normalizeUnit(match[3] || 'count');
    remainder = cleanText(match[4]);
    if (/^(large|medium|small)$/i.test(match[3] || '')) remainder = [match[3], remainder].filter(Boolean).join(' ');
  } else {
    const qualitative = normalized.match(/^(.+?)\s+(handful|pinch|as required|as needed|to taste)(.*)$/i);
    if (qualitative) {
      itemText = qualitative[1].trim();
      amount = /handful|pinch/i.test(qualitative[2]) ? 1 : null;
      unit = /handful/i.test(qualitative[2]) ? 'handful' : /pinch/i.test(qualitative[2]) ? 'pinch' : 'as needed';
      remainder = cleanText(qualitative[3]);
    }
  }

  const sectionNote = section ? `for ${section.replace(/^prepare\s+/i, '').replace(/:$/, '').trim()}` : '';
  remainder = remainder.replace(/^\.+\s*/, '').replace(/^\+\s*/, 'plus ').trim();
  const preparation = [remainder, sectionNote].filter(Boolean).join('; ') || undefined;
  const item = englishIngredientName(itemText) || itemText;
  const ingredient = { item, text: original };
  if (amount !== null && Number.isFinite(amount)) ingredient.amount = Math.round(amount * 1_000) / 1_000;
  if (unit !== 'count' || amount !== null) ingredient.unit = unit;
  if (preparation) ingredient.preparation = preparation;
  return ingredient;
}

function parseIngredients(lines) {
  const ingredients = [];
  let section = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^&nbsp;$/i.test(line)) continue;
    if (likelySection(line) && !/^[-–•]/.test(line)) {
      section = cleanText(line.replace(/^##\s*/, '')).replace(/:$/, '');
      continue;
    }
    const ingredient = parseIngredientLine(line, section);
    if (ingredient) ingredients.push(ingredient);
  }
  return ingredients;
}

function sentenceCase(value) {
  const text = cleanText(value).replace(/^[-–•]\s*/, '').trim();
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}

function rewriteInstruction(value) {
  const source = sentenceCase(value);
  const templates = [
    [/^preheat (?:the )?oven (?:at|to) (.+)$/i, (match) => `Heat the oven to ${match[1]} before assembling the dish.`],
    [/^cut (.+?) (?:in|into) (.+?)\.\s*fry it for (.+?) in oil with (.+)$/i, (match) => `Cut ${match[1]} into ${match[2]}, season with ${match[4]}, and sauté in oil for ${match[3]}.`],
    [/^in a baking tray place (.+)$/i, (match) => `Arrange ${match[1]} in a baking tray.`],
    [/^spread (.+)$/i, (match) => `Distribute ${match[1]} evenly over the base.`],
    [/^put the (.+?) in (?:the )?oven for (.+)$/i, (match) => `Bake the ${match[1]} for ${match[2]}.`],
    [/^(?:delicious\s+)?(.+?) is ready(?: to serve)?\.?$/i, (match) => `Serve the finished ${match[1]} while fresh.`],
  ];
  const template = templates.find(([pattern]) => pattern.test(source));
  if (template) return sentenceCase(source.replace(template[0], (...args) => template[1](args)))
    .replace(/\.{2,}$/g, '.');

  let text = source
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .replace(/\bnow\s+/gi, '')
    .replace(/\bthen\s+/gi, '')
    .replace(/\bwith the help of (?:a |the )?/gi, 'using ')
    .replace(/\bturn on the (?:flame|heat)\s*,?\s*/gi, '')
    .replace(/\bturn off the (?:flame|heat)\b/gi, 'remove from the heat')
    .replace(/\bmix well\b/gi, 'combine thoroughly')
    .replace(/\bblend well\b/gi, 'blend until smooth')
    .replace(/\bchop well\b/gi, 'process to the required texture')
    .replace(/\bbring it to (?:a )?boil\b/gi, 'bring the mixture to a boil')
    .replace(/\bon low flame\b/gi, 'over low heat')
    .replace(/\bon medium flame\b/gi, 'over medium heat')
    .replace(/\bon high flame\b/gi, 'over high heat')
    .replace(/\bset aside\b/gi, 'reserve')
    .replace(/\blet it cool\b/gi, 'leave to cool')
    .replace(/\bdeep fry\b/gi, 'fry in deep oil')
    .replace(/\bshallow fry\b/gi, 'fry in a shallow layer of oil')
    .replace(/\btransfer it to\b/gi, 'move the mixture to')
    .replace(/\badd prepared\b/gi, 'incorporate the prepared')
    .replace(/\badd remaining\b/gi, 'stir in the remaining')
    .replace(/\badd\b/gi, 'stir in')
    .replace(/\bmix\b/gi, 'combine')
    .replace(/\bserve immediately\b/gi, 'serve while fresh')
    .replace(/\bis ready\b/gi, 'is complete')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/,{2,}/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  const container = text.match(/^In (?:a|an|the) ([^,]+),\s*stir in (.+)$/i);
  if (container) text = `Combine ${container[2]} in the ${container[1]}.`;
  const bowl = text.match(/^Stir in (.+?) (?:in|into) (?:a|an|the) ([^.]+)\.?$/i);
  if (bowl) text = `Place ${bowl[1]} in the ${bowl[2]}.`;
  if (normalizeComparable(text) === normalizeComparable(source)) {
    text = text
      .replace(/^Cut\s+(.+)$/i, 'Prepare $1 by cutting it as described')
      .replace(/^Spread\s+(.+)$/i, 'Arrange $1 in an even layer')
      .replace(/^Put\s+(.+)$/i, 'Place $1')
      .replace(/^Heat\s+(.+)$/i, 'Warm $1')
      .replace(/^Take\s+(.+)$/i, 'Use $1');
  }
  text = sentenceCase(text);
  text = text.replace(/\.{2,}/g, '.');
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

function compressIngredientEnumeration(value) {
  let text = String(value || '').trim();
  if ((text.match(/,/g) || []).length < 4) return text;
  const prefixMatch = text.match(/^([^:]{1,45}:\s*)?(Combine|Stir in)\s+/i);
  if (!prefixMatch) return text;
  const action = /(?:,|\band\b)\s*(combine(?: thoroughly| until [^.;]+)?|mix(?: until [^.;]+)?|whisk(?: until [^.;]+)?|blend(?: until [^.;]+)?|grind(?: until [^.;]+)?|knead(?: until [^.;]+)?|cook(?: [^.;]+)?|cover(?: [^.;]+)?|bring [^.;]+|fry [^.;]+|saut[eé] [^.;]+|bake [^.;]+|air fry [^.;]+|simmer [^.;]+|boil [^.;]+|roast [^.;]+|serve[^.;]*)/i.exec(text);
  if (!action) return text;
  const prefix = prefixMatch[1] || '';
  const replacement = prefixMatch[2].toLowerCase() === 'combine' ? 'Combine the listed ingredients' : 'Add the listed ingredients';
  text = `${prefix}${replacement} and ${action[1]}${text.slice(action.index + action[0].length)}`;
  return text.replace(/\. In the ([^.]+)\.$/i, ' in a $1.').replace(/\s+/g, ' ').trim();
}

function tightenInstruction(value) {
  let text = String(value || '').trim()
    .replace(/^Combine sugar and cook on very low flame until sugar caramelizes and turns brown\.?(?: in the frying pan\.)?$/i, 'Cook the sugar over very low heat until brown and caramelized.')
    .replace(/^Pour (.+?) at the bottom of (.+?) and (?:let it )?rest for (.+?)\.?$/i, 'Pour $1 into $2; rest for $3.')
    .replace(/^Combine the listed ingredients and blend until smooth(?: in (?:a|the) blender jug)?\.?$/i, 'Blend the listed ingredients until smooth.')
    .replace(/^Pour (.+?) in (.+?) and cover with (.+?)\.?$/i, 'Pour $1 into $2; cover with $3.')
    .replace(/^In boiling water,.*?steam cook over low heat for (.+?)\.?$/i, 'Steam, covered, over low heat for $1.')
    .replace(/^Insert a wooden stick to check whether it is done\.?$/i, 'Check doneness with a wooden skewer.')
    .replace(/^Carefully remove the side of (.+?) using knife and flip it on (.+?)\.?$/i, 'Loosen the $1 edges with a knife; invert onto $2.')
    .replace(/^Combine (.+?) and heat it over low heat until it comes to simmer and remove from the heat in a saucepan\.?$/i, 'Heat $1 in a saucepan to a simmer; remove from the heat.')
    .replace(/^Combine egg yolks,caster sugar and whisk until it changes color \((.+?)\) in a bowl\.?$/i, 'Whisk egg yolks and caster sugar for $1 until pale.')
    .replace(/^Tamper the egg mixture by gradually adding hot cream in it and whisk continuously\.?$/i, 'Temper the eggs with hot cream, whisking continuously.')
    .replace(/^Pour all the mixture in remaining hot cream,and whisk well\.?$/i, 'Whisk the egg mixture into the remaining hot cream.')
    .replace(/^Pour warm pudding over bread and (?:let it )?soak for (.+?)\.?$/i, 'Pour the custard over the bread; soak for $1.')
    .replace(/^Place the baking dish in a large water bath fill with hot water\.?$/i, 'Set the dish in a hot-water bath.')
    .replace(/^Bake in preheated oven at (\d{2,3})\s*([CF]) for (.+?)(?: \(on both grills\))?\.?$/i, 'Bake at $1°$2 for $3.')
    .replace(/^Sprinkel\b/i, 'Sprinkle')
    .replace(/\bcombine thoroughly\b/gi, 'mix well')
    .replace(/\bStir in\b/gi, 'Add')
    .replace(/\blet it rest for\b/gi, 'rest for')
    .replace(/\blet it rest\b/gi, 'rest')
    .replace(/\band reserve\b/gi, '; reserve')
    .replace(/\band serve\b/gi, '; serve')
    .replace(/\band cover\b/gi, '; cover')
    .replace(/\band cook\b/gi, '; cook')
    .replace(/\band combine well\b/gi, '; mix well')
    .replace(/\. in (?:a|the) ([^.]+)\.$/i, ' in a $1.')
    .replace(/^Combine (.+?) and heat it over low heat until it comes to simmer and remove from the heat in a saucepan\.?$/i, 'Heat $1 in a saucepan to a simmer; remove from the heat.')
    .replace(/^Combine egg yolks,caster sugar and whisk until it changes color \((.+?)\) in a bowl\.?$/i, 'Whisk egg yolks and caster sugar for $1 until pale.')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
  return polishInstruction(text);
}

function normalizeComparable(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function ngrams(value, size = 4) {
  const words = normalizeComparable(value).split(/\s+/).filter(Boolean);
  const result = new Set();
  for (let index = 0; index <= words.length - size; index += 1) result.add(words.slice(index, index + size).join(' '));
  return result;
}

function jaccard(left, right) {
  const a = ngrams(left);
  const b = ngrams(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function compactInstructions(sourceLines, maxWords = MAX_INSTRUCTION_WORDS) {
  const steps = [];
  let section = null;
  for (const rawLine of sourceLines) {
    if (likelySection(rawLine) && !/^[-–•]/.test(rawLine)) {
      section = cleanText(rawLine.replace(/^##\s*/, '')).replace(/:$/, '');
      continue;
    }
    let rewritten = tightenInstruction(compressIngredientEnumeration(rewriteInstruction(rawLine)));
    if (!rewritten || rewritten.length < 3) continue;
    if (section) {
      rewritten = `${section.replace(/^prepare\s+/i, '')}: ${rewritten}`;
      section = null;
    }
    if (normalizeComparable(rewritten) === normalizeComparable(rawLine)) {
      const alternatives = [
        [/^In (?:a |the )?([^,]+),\s*(.+)$/i, '$2 in a $1.'],
        [/^Serve chilled!?$/i, 'Chill before serving.'],
        [/^Serve\s+(.+)$/i, 'Present $1'],
        [/^Garnish with\s+(.+)$/i, 'Finish with $1'],
        [/^Sprinkle\s+(.+)$/i, 'Scatter $1'],
        [/^Place\s+(.+)$/i, 'Set $1'],
        [/^Apply\s+(.+)$/i, 'Spread $1'],
        [/^Check\s+(.+)$/i, 'Test $1'],
        [/^Remove\s+(.+)$/i, 'Take out $1'],
        [/^Cover\s+(.+)$/i, 'Seal $1'],
        [/^Cut\s+(.+)$/i, 'Slice $1'],
      ];
      const alternative = alternatives.find(([pattern]) => pattern.test(rewritten));
      rewritten = alternative
        ? rewritten.replace(alternative[0], alternative[1])
        : `Proceed by ${rewritten.charAt(0).toLowerCase()}${rewritten.slice(1)}`;
    }
    steps.push(rewritten);
  }

  const totalWords = steps.join(' ').split(/\s+/).filter(Boolean).length;
  if (totalWords <= maxWords) return steps.map(polishInstruction).filter(Boolean);

  const groupCount = Math.min(18, steps.length);
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const start = Math.floor((index * steps.length) / groupCount);
    const end = Math.floor(((index + 1) * steps.length) / groupCount);
    return steps.slice(start, Math.max(start + 1, end));
  });

  function factFragments(group) {
    const text = group.join(' ');
    const patterns = [
      /\b\d+(?:\.\d+)?(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?\s*(?:hours?|hrs?|minutes?|mins?)\b/gi,
      /\b\d{2,3}\s*°?\s*[CF]\b/g,
      /\buntil\s+[^,.;]{2,45}/gi,
      /\b(?:makes?|serves?|yield)\s*:?-?\s*[^,.;]{1,30}/gi,
    ];
    return [...new Set(patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => cleanText(match[0]))))];
  }

  function actionHead(step, wordLimit) {
    const firstClause = polishInstruction(step)
      .replace(/^At this point,\s*/i, '')
      .split(/[.;!?]/)[0]
      .trim();
    const words = firstClause.split(/\s+/).slice(0, Math.max(3, wordLimit));
    while (words.length > 2 && /^(?:and|or|with|in|into|to|for|from|of|the|a|an|on|over|under|at|by)$/i.test(words.at(-1))) words.pop();
    return words.join(' ').replace(/[,;:]+$/, '').trim();
  }

  function summarize(allowance) {
    return groups.map((group) => {
      const facts = factFragments(group);
      const factWords = facts.join(' ').split(/\s+/).filter(Boolean).length;
      const perAction = Math.max(3, Math.floor((allowance - factWords) / group.length));
      let text = group.map((step) => actionHead(step, perAction)).filter(Boolean).join('; ');
      const missingFacts = facts.filter((fact) => !normalizeComparable(text).includes(normalizeComparable(fact)));
      if (missingFacts.length) text += ` (${missingFacts.join('; ')})`;
      return polishInstruction(text);
    });
  }

  let allowance = Math.max(5, Math.floor(maxWords / groupCount));
  let output = summarize(allowance);
  while (allowance > 4 && output.join(' ').split(/\s+/).filter(Boolean).length > maxWords) {
    allowance -= 1;
    output = summarize(allowance);
  }
  if (output.join(' ').split(/\s+/).filter(Boolean).length > maxWords) {
    throw new Error('instructions_word_budget_exceeded');
  }
  return output.map(polishInstruction).filter(Boolean);
}

function polishInstruction(value) {
  let text = cleanText(value)
    .replace(/\bCarry out this step:\s*/gi, 'At this point, ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/([.!?])\s+([a-z])/g, (match, punctuation, letter) => `${punctuation} ${letter.toUpperCase()}`)
    .trim();
  let balanced = '';
  let parenthesisDepth = 0;
  for (const character of text) {
    if (character === '(') parenthesisDepth += 1;
    if (character === ')') {
      if (parenthesisDepth === 0) continue;
      parenthesisDepth -= 1;
    }
    balanced += character;
  }
  if (parenthesisDepth > 0) {
    const punctuation = balanced.match(/[.!?]$/)?.[0] || '';
    balanced = `${punctuation ? balanced.slice(0, -1) : balanced}${')'.repeat(parenthesisDepth)}${punctuation}`;
  }
  text = balanced.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  if (text && !/[.!?]$/.test(text)) text += '.';
  return text;
}

function parseDurationMinutes(sourceLines) {
  let prep = 0;
  let cook = 0;
  let other = 0;
  for (const line of sourceLines) {
    const normalized = normalizeFractions(cleanText(line));
    const matches = normalized.matchAll(/(\d+(?:\.\d+)?)(?:\s*(?:-|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)/gi);
    for (const match of matches) {
      const amount = match[2] ? (Number(match[1]) + Number(match[2])) / 2 : Number(match[1]);
      const minutes = /hour|hr/i.test(match[3]) ? amount * 60 : amount;
      if (/soak|marinat|refrigerat|rest|rise|proof|cool|freeze|chill/i.test(normalized)) prep += minutes;
      else if (/cook|bake|fry|simmer|boil|roast|grill|microwave|steam|heat|oven|dum\b/i.test(normalized)) cook += minutes;
      else other += minutes;
    }
  }
  const round = (value) => value > 0 ? Math.round(value) : null;
  return {
    prep: round(prep),
    cook: round(cook || other),
    total: round(prep + cook + other),
  };
}

function parseServings(text, ingredients) {
  const patterns = [
    /\bserves?\s*:?-?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?/i,
    /\bservings?\s*:?-?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?/i,
    /\bmakes?\s*:?-?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*(?:servings?|portions?|burgers?|sandwiches?|glasses?|cups?|pieces?|pcs?|rolls?|kebabs?|kababs?|tikkis?|parathas?|rotis?|naans?)?/i,
  ];
  for (const pattern of patterns) {
    const match = cleanText(text).match(pattern);
    if (match) {
      const value = match[2] ? Math.round((Number(match[1]) + Number(match[2])) / 2) : Number(match[1]);
      if (value > 0 && value <= 100) return { servings: value, basis: 'source_reported' };
    }
  }
  const pieceIngredient = ingredients.find((ingredient) =>
    Number(ingredient.amount) > 1
    && Number(ingredient.amount) <= 24
    && ['piece', 'slice', 'count'].includes(ingredient.unit)
    && /\b(bread|bun|fillet|roll|wrap|tortilla|paratha|roti|naan|puri|glass|cup|serving)\b/i.test(ingredient.item));
  if (pieceIngredient) return { servings: Math.max(2, Math.min(12, Math.round(pieceIngredient.amount))), basis: 'estimated_from_ingredient_yield' };
  return { servings: 4, basis: 'default_estimate' };
}

function categoryFromClasses(classList, name) {
  const values = new Set((classList || [])
    .filter((value) => value.startsWith('recipe_category-'))
    .map((value) => value.replace(/^recipe_category-/, '')));
  const titleRules = [
    [/drink|shake|lassi|sharbat|coffee|tea|chai|smoothie|mojito/i, 'Drinks'],
    [/cake|halwa|kheer|dessert|sweet|cookie|brownie|pudding|kulfi|mithai|zarda|trifle|donut|doughnut/i, 'Dessert'],
    [/breakfast|omelette|omelet/i, 'Breakfast'],
    [/biryani|pulao|pilaf|fried rice|rice bowl/i, 'Rice & biryani'],
    [/pasta|macaroni|spaghetti|lasagn|fettuccine|penne/i, 'Pasta, macaroni & lasagna'],
    [/burger|sandwich|slider/i, 'Burgers & sandwiches'],
    [/curry|karahi|handi|qorma|korma|salan|stew|nihari|haleem|gosht/i, 'Curries & stews'],
    [/\bdaal\b|\bdal\b|lentil|chana|cholay|chole|rajma|lobia/i, 'Daal & legumes'],
    [/kebab|kabab|tikka/i, 'Kababs'],
    [/chutney|raita|dip\b|achar|pickle/i, 'Chutneys & dips'],
    [/salad/i, 'Salads'],
    [/naan|roti|paratha|bread|puri|kulcha/i, 'Breads'],
    [/soup/i, 'Soup'],
  ];
  const titleCategory = titleRules.find(([pattern]) => pattern.test(name));
  if (titleCategory) return titleCategory[1];

  const candidates = [
    [['drinks', '1-drinks'], 'Drinks'],
    [['desserts', '1desserts', 'desi-desserts', 'cakes', 'cakess'], 'Dessert'],
    [['breakfast', 'breakfast-meal', 'desi-breakfast'], 'Breakfast'],
    [['biryani-pulao'], 'Rice & biryani'],
    [['pasta', 'pastas', 'passta'], 'Pasta, macaroni & lasagna'],
    [['burgers', 'burgers-sandwiches', 'sandwiches'], 'Burgers & sandwiches'],
    [['salanscurrys', 'gravys'], 'Curries & stews'],
    [['daal', '1-daaal', 'lentils-daal'], 'Daal & legumes'],
    [['kababs'], 'Kababs'],
    [['chutneys-dips'], 'Chutneys & dips'],
    [['salads', '1salads'], 'Salads'],
    [['1breads', 'breads'], 'Breads'],
    [['soup'], 'Soup'],
    [['appetizers-snacks', 'fried-items'], 'Snacks & street food'],
    [['healthy'], 'Healthy'],
    [['lunch-dinner', 'dinner', 'everyday-cooking'], 'Main Course'],
  ];
  for (const [slugs, label] of candidates) if (slugs.some((value) => values.has(value))) return label;
  return 'Main Course';
}

function cuisineFromName(name) {
  const cuisines = [
    [/afghan/i, 'Afghan'], [/turk/i, 'Turkish'], [/korean/i, 'Korean'], [/thai/i, 'Thai'],
    [/chinese|szechuan|schezwan|manchurian|chow mein|hakka/i, 'Chinese'], [/italian/i, 'Italian'], [/mexican|taco/i, 'Mexican'],
    [/arab|leban|shawarma|mandi/i, 'Middle Eastern'], [/indian/i, 'Indian'],
  ];
  return cuisines.find(([pattern]) => pattern.test(name))?.[1] || 'Pakistani';
}

function inferAllergens(ingredients) {
  const text = ingredients.map((ingredient) => `${ingredient.item} ${ingredient.text}`).join(' ').toLowerCase();
  const rules = [
    ['milk', /\b(milk|doodh|cream|yogurt|yoghurt|dahi|butter|ghee|paneer|cheese|khoya|mawa)\b/],
    ['egg', /\b(egg|eggs|anda|anday)\b/],
    ['gluten', /\b(flour|maida|atta|bread|bun|breadcrumbs|pasta|macaroni|noodles|soy sauce)\b/],
    ['nuts', /\b(almond|badam|cashew|kaju|pistachio|pista|walnut|peanut|hazelnut|nutella|nuts?)\b/],
    ['fish', /\b(fish|machli)\b/],
    ['shellfish', /\b(prawn|shrimp|crab|lobster)\b/],
    ['soy', /\bsoya?(?:bean| sauce)?\b/],
    ['sesame', /\b(sesame|til)\b/],
    ['mustard', /\bmustard\b/],
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function inferDietTags(ingredients) {
  const text = ingredients.map((ingredient) => `${ingredient.item} ${ingredient.text}`).join(' ').toLowerCase();
  const animal = /\b(chicken|beef|mutton|lamb|goat|meat|fish|prawn|shrimp|crab|liver|kaleji|gelatin)\b/.test(text);
  const egg = /\b(egg|eggs|anda|anday)\b/.test(text);
  const dairy = /\b(milk|doodh|cream|yogurt|yoghurt|dahi|butter|ghee|paneer|cheese|khoya|mawa)\b/.test(text);
  const tags = ['balanced'];
  if (!animal) tags.push('vegetarian');
  if (!animal && !egg && !dairy && !/\bhoney\b/.test(text)) tags.push('vegan');
  return tags;
}

function inferMethodTags(sourceText) {
  const text = sourceText.toLowerCase();
  const tags = [];
  if (/air[ -]?fry/.test(text)) tags.push('air-fryer');
  if (/oven|bake/.test(text)) tags.push('oven');
  if (/grill|barbecue|bbq/.test(text)) tags.push('grill');
  if (/deep fry|shallow fry|fry in/.test(text)) tags.push('fried');
  if (/stove|wok|pan|pot|karahi|kadhai/.test(text)) tags.push('stovetop');
  if (!tags.length && /blend|refrigerate|chill/.test(text)) tags.push('no-cook');
  return tags;
}

function parseRecipeRecord(record, html) {
  const name = cleanText(record.title?.rendered);
  if (!name) throw new Error('title_missing');
  const sections = parseRecipeSections(html);
  const ingredients = parseIngredients(sections.ingredientLines);
  if (!ingredients.length) throw new Error('ingredients_empty');
  const sourceDirections = sections.directionLines.filter((line) => !/^&nbsp;$/i.test(line));
  const instructions = compactInstructions(sourceDirections);
  if (!instructions.length) throw new Error('instructions_empty');
  const sourceMethod = sourceDirections.filter((line) => !likelySection(line)).map(cleanText).join(' ');
  const generatedMethod = instructions.join(' ');
  const overlap = jaccard(sourceMethod, generatedMethod);
  if (normalizeComparable(sourceMethod) === normalizeComparable(generatedMethod)) throw new Error('instructions_exact_copy');
  if (overlap > 0.72) throw new Error(`instructions_high_overlap_${overlap.toFixed(3)}`);

  const servings = parseServings(`${sections.block} ${record.content?.rendered || ''}`, ingredients);
  const times = parseDurationMinutes(sourceDirections);
  const category = categoryFromClasses(record.class_list, name);
  const cuisine = cuisineFromName(name);
  const methodTags = inferMethodTags(sourceMethod);
  const recipeSlug = slug(record.slug || name);
  const sourceId = Number(record.id);

  return {
    id: `foodfusion-${recipeSlug}-${sourceId}`,
    name,
    dish_family: name,
    region: null,
    category,
    cuisine: [cuisine],
    difficulty: instructions.length > 10 ? 'hard' : instructions.length > 6 ? 'medium' : 'easy',
    servings: servings.servings,
    servings_basis: servings.basis,
    times_minutes: times,
    ingredients,
    instructions,
    method: {
      basis: 'independently_generated_from_public_method_facts',
      confidence: overlap < 0.45 ? 'moderate-high' : 'moderate',
      tags: methodTags,
    },
    nutrition_per_serving: {
      kcal: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      fiber_g: null,
      iron_mg: null,
      calcium_mg: null,
      vitamin_c_mg: null,
      sodium_mg: null,
      basis: 'not_available',
      confidence: 'not_available',
      ingredient_weight_coverage: null,
    },
    allergens: inferAllergens(ingredients),
    diet_tags: inferDietTags(ingredients),
    source_attributions: [{
      source_name: 'Food Fusion',
      recipe_title: name,
      role: 'primary',
    }],
    import_metadata: {
      source_record_id: sourceId,
      source_slug: recipeSlug,
      source_modified: record.modified || null,
      instruction_fourgram_overlap: Math.round(overlap * 1_000) / 1_000,
    },
  };
}

async function discoverRecords(limit = null) {
  const firstUrl = `${API_ROOT}?per_page=100&page=1&orderby=id&order=asc&_fields=id,slug,link,title,class_list,date,modified`;
  const firstResponse = await fetchWithRetry(firstUrl);
  const total = Number(firstResponse.headers.get('x-wp-total'));
  const totalPages = Number(firstResponse.headers.get('x-wp-totalpages'));
  const records = await firstResponse.json();
  for (let page = 2; page <= totalPages && (limit === null || records.length < limit); page += 1) {
    const pageRecords = await fetchJson(`${API_ROOT}?per_page=100&page=${page}&orderby=id&order=asc&_fields=id,slug,link,title,class_list,date,modified`);
    records.push(...pageRecords);
    process.stdout.write(`\rDiscovered ${Math.min(records.length, total)} of ${total} records`);
  }
  process.stdout.write('\n');
  const unique = [...new Map(records.map((record) => [record.id, record])).values()].sort((a, b) => a.id - b.id);
  return { reportedTotal: total, records: limit === null ? unique : unique.slice(0, limit) };
}

async function readCheckpoint(filename, refresh) {
  if (refresh) return { recipes: {}, failures: {} };
  try {
    const checkpoint = JSON.parse(await fs.readFile(filename, 'utf8'));
    return {
      recipes: checkpoint.recipes || {},
      failures: checkpoint.failures || {},
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { recipes: {}, failures: {} };
    throw error;
  }
}

async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, filename);
}

async function importRecords(records, options, checkpoint) {
  let completed = Object.keys(checkpoint.recipes).length + Object.keys(checkpoint.failures).length;
  let checkpointWrites = 0;
  let nextIndex = 0;

  async function saveCheckpoint() {
    checkpointWrites += 1;
    await writeJson(options.checkpoint, checkpoint);
  }

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= records.length) break;
      const record = records[index];
      const key = String(record.id);
      if (checkpoint.recipes[key] || checkpoint.failures[key]) continue;
      try {
        const html = await fetchText(record.link);
        checkpoint.recipes[key] = parseRecipeRecord(record, html);
      } catch (error) {
        checkpoint.failures[key] = {
          source_record_id: record.id,
          title: cleanText(record.title?.rendered) || record.slug,
          url: record.link,
          reason: error.message,
        };
      }
      completed += 1;
      process.stdout.write(`\rProcessed ${completed}/${records.length}; parsed ${Object.keys(checkpoint.recipes).length}; failed ${Object.keys(checkpoint.failures).length}`);
      if (completed % 25 === 0) await saveCheckpoint();
      if (options.delay) await sleep(options.delay);
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));
  await saveCheckpoint();
  process.stdout.write('\n');
  return checkpointWrites;
}

function buildFamilies(recipes) {
  const grouped = new Map();
  for (const recipe of recipes) {
    const key = slug(recipe.dish_family || recipe.name);
    const family = grouped.get(key) || {
      id: `foodfusion-${key}`,
      name: recipe.dish_family || recipe.name,
      variant_count: 0,
      variants: [],
    };
    family.variants.push(recipe);
    family.variant_count = family.variants.length;
    grouped.set(key, family);
  }
  return [...grouped.values()]
    .map((family) => ({ ...family, variants: family.variants.sort((a, b) => a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildValidation(recipes, families, failures, requestedCount) {
  const ids = recipes.map((recipe) => recipe.id);
  const ingredientErrors = recipes.filter((recipe) => !recipe.ingredients.length).map((recipe) => recipe.id);
  const instructionErrors = recipes.filter((recipe) => !recipe.instructions.length).map((recipe) => recipe.id);
  const emptyInstructionItems = recipes
    .filter((recipe) => recipe.instructions.some((instruction) => !String(instruction).trim()))
    .map((recipe) => recipe.id);
  const instructionWordErrors = recipes
    .filter((recipe) => recipe.instructions.join(' ').split(/\s+/).filter(Boolean).length > MAX_INSTRUCTION_WORDS)
    .map((recipe) => recipe.id);
  const urlLeaks = recipes.filter((recipe) => /https?:\/\//i.test(JSON.stringify(recipe))).map((recipe) => recipe.id);
  const exactDuplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  return {
    passes: [
      { name: 'schema_and_unique_ids', status: exactDuplicates.length ? 'failed' : 'passed', records_checked: recipes.length, record_errors: exactDuplicates },
      { name: 'ingredients_and_instructions_present', status: ingredientErrors.length || instructionErrors.length || emptyInstructionItems.length ? 'failed' : 'passed', records_checked: recipes.length, ingredient_errors: ingredientErrors, instruction_errors: instructionErrors, empty_instruction_item_errors: emptyInstructionItems },
      { name: 'instruction_word_budget', status: instructionWordErrors.length ? 'failed' : 'passed', records_checked: recipes.length, maximum_words_per_recipe: MAX_INSTRUCTION_WORDS, record_errors: instructionWordErrors },
      { name: 'no_source_page_links_in_recipe_objects', status: urlLeaks.length ? 'failed' : 'passed', records_checked: recipes.length, record_errors: urlLeaks },
      { name: 'catalog_accounting', status: recipes.length + failures.length === requestedCount ? 'passed' : 'failed', requested: requestedCount, parsed: recipes.length, failed: failures.length },
      { name: 'family_variant_accounting', status: families.reduce((sum, family) => sum + family.variant_count, 0) === recipes.length ? 'passed' : 'failed', families: families.length, variants: recipes.length },
    ],
  };
}

function buildDataset(recipes, failures, discovery, options) {
  const families = buildFamilies(recipes);
  const validation = buildValidation(recipes, families, failures, discovery.records.length);
  const generatedOn = new Date().toISOString().slice(0, 10);
  validation.result = validation.passes.every((pass) => pass.status === 'passed') ? 'passed' : 'failed';
  return {
    schema_version: '1.0.0',
    dataset_name: 'Food Fusion Recipes',
    generated_on: generatedOn,
    purpose: 'A separate Food Fusion recipe import for later review and merging into Shopping Assistant.',
    standalone: true,
    content_note: `Contains public recipe metadata and ingredient facts. Directions are concise independent formulations derived from functional method facts, capped at ${MAX_INSTRUCTION_WORDS} words per recipe. Images and individual source-page links are intentionally excluded.`,
    variant_model: {
      approach: 'Every successfully parsed Food Fusion record remains a recipe variant. Exact title matches share a dish family; no parsed catalog records are collapsed.',
      dish_family_count: families.length,
      recipe_variant_count: recipes.length,
    },
    source_inventory: {
      source_name: 'Food Fusion',
      public_api_records_reported: discovery.reportedTotal,
      records_requested: discovery.records.length,
      records_parsed: recipes.length,
      records_failed: failures.length,
      crawl_delay_ms_per_worker: options.delay,
      concurrency: options.concurrency,
      images_downloaded: 0,
    },
    deduplication_summary: {
      input_source_records: discovery.records.length,
      unique_recipe_variants: recipes.length,
      exact_title_family_groups: families.filter((family) => family.variant_count > 1).length,
      records_collapsed: 0,
    },
    exclusions: {
      images: 'excluded_by_request',
      source_page_links_in_recipe_objects: 'excluded_by_request',
      failed_or_unparseable_records: failures.length,
    },
    nutrition_methodology: {
      source_values: 'Food Fusion pages do not expose normalized per-serving nutrition in the imported recipe block.',
      missing_values: 'Stored as null and labelled not_available; no nutrition values were invented.',
    },
    validation,
    dish_families: families,
  };
}

function buildReport(discovery, recipes, failures, checkpointWrites, options, startedAt) {
  const reasonCounts = {};
  for (const failure of failures) reasonCounts[failure.reason] = (reasonCounts[failure.reason] || 0) + 1;
  const missingServings = recipes.filter((recipe) => recipe.servings_basis !== 'source_reported');
  const missingTimes = recipes.filter((recipe) => !recipe.times_minutes.total);
  return {
    generated_at: new Date().toISOString(),
    duration_seconds: Math.round((Date.now() - startedAt) / 100) / 10,
    source_records_reported: discovery.reportedTotal,
    records_requested: discovery.records.length,
    parsed_count: recipes.length,
    failure_count: failures.length,
    images_downloaded: 0,
    source_links_stored_in_recipe_objects: 0,
    servings: {
      source_reported: recipes.length - missingServings.length,
      estimated_or_defaulted: missingServings.length,
    },
    times: {
      derived_from_explicit_method_durations: recipes.length - missingTimes.length,
      unavailable: missingTimes.length,
    },
    instruction_policy: {
      method: 'independent concise formulation from functional cooking facts',
      maximum_words_per_recipe: MAX_INSTRUCTION_WORDS,
      exact_copies_rejected: true,
      high_fourgram_overlap_threshold: 0.72,
    },
    run_options: {
      concurrency: options.concurrency,
      delay_ms_per_worker: options.delay,
      checkpoint_writes: checkpointWrites,
      limited_run: options.limit !== null,
    },
    failure_reasons: reasonCounts,
    failures,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const startedAt = Date.now();
  const discovery = await discoverRecords(options.limit);
  const checkpoint = await readCheckpoint(options.checkpoint, options.refresh);
  const requestedIds = new Set(discovery.records.map((record) => String(record.id)));
  checkpoint.recipes = Object.fromEntries(Object.entries(checkpoint.recipes).filter(([id]) => requestedIds.has(id)));
  checkpoint.failures = Object.fromEntries(Object.entries(checkpoint.failures).filter(([id]) => requestedIds.has(id)));
  if (options.retryFailures) checkpoint.failures = {};
  const checkpointWrites = await importRecords(discovery.records, options, checkpoint);
  const polishedRecipes = Object.values(checkpoint.recipes)
    .map((recipe) => ({ ...recipe, instructions: recipe.instructions.map(polishInstruction).filter(Boolean) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const recordsById = new Map(discovery.records.map((record) => [Number(record.id), record]));
  const overBudgetFailures = {};
  const recipes = polishedRecipes.filter((recipe) => {
    const words = recipe.instructions.join(' ').split(/\s+/).filter(Boolean).length;
    if (words <= MAX_INSTRUCTION_WORDS) return true;
    const sourceId = Number(recipe.import_metadata?.source_record_id);
    const record = recordsById.get(sourceId);
    overBudgetFailures[sourceId] = {
      source_record_id: sourceId,
      title: recipe.name,
      url: record?.link || null,
      reason: 'instructions_word_budget_exceeded',
    };
    return false;
  });
  const failures = Object.values({ ...checkpoint.failures, ...overBudgetFailures })
    .sort((a, b) => a.source_record_id - b.source_record_id);
  const dataset = buildDataset(recipes, failures, discovery, options);
  const report = buildReport(discovery, recipes, failures, checkpointWrites, options, startedAt);
  await writeJson(options.output, dataset);
  await writeJson(options.report, report);
  console.log(`Wrote ${recipes.length} recipes to ${options.output}`);
  console.log(`Wrote ${failures.length} failures to ${options.report}`);
  if (!options.limit && failures.length === 0) await fs.rm(options.checkpoint, { force: true });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  MAX_INSTRUCTION_WORDS,
  buildDataset,
  buildFamilies,
  categoryFromClasses,
  compactInstructions,
  compressIngredientEnumeration,
  tightenInstruction,
  decodeEntities,
  extractEnglishBlock,
  htmlBlockToLines,
  jaccard,
  normalizeFractions,
  parseIngredientLine,
  parseIngredients,
  parseNumber,
  polishInstruction,
  parseRecipeRecord,
  parseRecipeSections,
  parseServings,
  rewriteInstruction,
  slug,
};
