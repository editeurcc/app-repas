// server/search-api.js — Express server with optional SerpAPI integration and JSON-LD extraction
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const fs = require('fs');
const favoritesFile = path.join(__dirname, 'favorites.json');

function readFavorites() {
  try {
    if (!fs.existsSync(favoritesFile)) {
      fs.writeFileSync(favoritesFile, JSON.stringify([]), 'utf8');
      return [];
    }
    const txt = fs.readFileSync(favoritesFile, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) { return []; }
}

function writeFavorites(list) {
  try {
    fs.writeFileSync(favoritesFile, JSON.stringify(list || [], null, 2), 'utf8');
    return true;
  } catch (e) { console.error('writeFavorites error', e && e.message); return false; }
}

// Serve static files from project root
app.use(express.static(path.join(__dirname, '..')));

const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const LIVE_SEARCH = process.env.LIVE_SEARCH === '1';

// Simple in-memory cache with TTL
const cache = new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (entry.ttl || 5 * 60 * 1000)) { cache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data, ttl = 5 * 60 * 1000) { cache.set(key, { ts: Date.now(), data, ttl }); }

async function fetchSerpApi(query) {
  // Use SerpAPI to search Google with site: filters
  const q = `site:jow.fr OR site:marmiton.org OR site:irealime.com ${query}`;
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=10&hl=fr&gl=fr&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('SerpAPI error ' + resp.status);
  return resp.json();
}

async function extractRecipeFromUrl(pageUrl) {
  try {
    const resp = await fetch(pageUrl, { headers: { 'User-Agent': 'Mon-Menu-Bot/1.0 (+https://example.local)' } });
    if (!resp.ok) throw new Error('fetch page failed');
    const html = await resp.text();
    const $ = cheerio.load(html);

    // Attempt to parse JSON-LD script tags
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const s of scripts) {
      try {
        const txt = $(s).contents().text();
        if (!txt) continue;
        const parsed = JSON.parse(txt);
        // JSON-LD can be an array or object; search for '@type': 'Recipe'
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          if (node['@type'] && String(node['@type']).toLowerCase().includes('recipe')) {
            // Normalize
            const ingredients = (node.recipeIngredient || node.ingredients || node.ingredientsList || node.recipeIngredients || []).map(i => {
              // Try simple split quantity/name — best effort
              return { name: String(i).replace(/^[0-9\/\s.,]+/,'').trim(), quantity: '', unit: '' };
            });
            return {
              title: node.name || node.headline || '',
              time: node.totalTime || node.cookTime || node.prepTime || '',
              calories: (node.nutrition && node.nutrition.calories) || '',
              ingredients,
              url: pageUrl,
              source: new URL(pageUrl).hostname
            };
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Site-specific extraction heuristics (try to get ingredients + preparation)
    const hostname = new URL(pageUrl).hostname;
    let title = $('h1').first().text().trim() || $('title').text().trim();
    let ingredients = [];
    let preparation = [];
    let time = '';

    // Marmiton
    if (hostname.includes('marmiton.org')) {
      title = title || $('meta[property="og:title"]').attr('content') || title;
      // ingredients
      $('ul.recipe-ingredients__list li, .recipe-ingredients__list li, .ingredients-list li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) ingredients.push({ raw: txt });
      });
      // steps
      $('ol.recipe-preparation__list li, .recipe-preparation__list li, .preparation-steps li, .instructions li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) preparation.push(txt);
      });
      time = $('.recipe-infos__total-time, .recipe-infos__time, .recipe-infos__cooking-time').first().text().trim() || time;
    }

    // Jow
    if (hostname.includes('jow.fr')) {
      title = title || $('meta[property="og:title"]').attr('content') || title;
      $('ul.ingredients__list li, .ingredients-list li, .recipe-ingredients li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) ingredients.push({ raw: txt });
      });
      $('.steps__list li, .preparation__list li, .method li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) preparation.push(txt);
      });
      time = $('[data-test="recipe-duration"], .recipe-time, .time').first().text().trim() || time;
    }

    // Irealime
    if (hostname.includes('irealime')) {
      title = title || $('meta[property="og:title"]').attr('content') || title;
      $('.ingredients li, .ingredients-list li, .recipe-ingredients li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) ingredients.push({ raw: txt });
      });
      $('.preparation li, .preparation-steps li, .method li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) preparation.push(txt);
      });
      time = $('.time, .recipe-time').first().text().trim() || time;
    }

    // Normalize ingredients parsing if we only have raw strings
    if (ingredients.length > 0) {
      const normalized = ingredients.map(i => {
        const raw = (i.raw || i).toString().trim();
        // try to pull leading quantity and unit (handle fractions like 1/2)
        const units = 'g|kg|mg|ml|cl|l|cuillères|cuillère|càs|c.à.s|c.à.c|càc|tasse|pinch|pincée|pièce|piece|stk|slice|tranche|bouquet';
        const m = raw.match(/^([0-9]+[0-9\/,\.\s\/]*)\s*(?:(${units}))?\s*(.*)/i);
        if (m) {
          const qty = m[1].replace(/\s+/g,' ').trim();
          const unit = (m[2] || '').trim();
          const name = (m[3] || '').trim();
          return { quantity: qty, unit: unit, name: name, raw };
        }
        // try quantity + name
        const m2 = raw.match(/^([0-9\/,\.\s\/]+)\s+(.*)$/);
        if (m2) return { quantity: m2[1].trim(), unit: '', name: m2[2].trim(), raw };
        return { quantity: '', unit: '', name: raw, raw };
      });

      return {
        title: title || pageUrl,
        time: time || '',
        calories: '',
        ingredients: normalized,
        preparation: preparation,
        url: pageUrl,
        source: hostname
      };
    }

    // Fallback: return minimal
    return { title: title || pageUrl, time: time || '', calories: '', ingredients: [], preparation: preparation, url: pageUrl, source: hostname };
  } catch (err) {
    return null;
  }
}

async function findLinksFromSearch(domain, query) {
  const candidates = [];
  const q = encodeURIComponent(query);
  // Helper: parse Marmiton search results page for direct recipe links
  async function marmitonSearchLinks(qraw) {
    // If HEADLESS mode enabled, try Playwright to render and extract dynamic results
    if (process.env.HEADLESS === '1') {
      try {
        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const url = `https://www.marmiton.org/recettes/recherche.aspx?aqt=${encodeURIComponent(qraw)}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // wait for search list items or card titles
        try { await page.waitForSelector('li.search-list__item, a.card-content__title', { timeout: 4000 }); } catch (e) {}
        const items = await page.evaluate(() => {
          const out = [];
          const base = location.origin;
          // prefer structured list items
          document.querySelectorAll('li.search-list__item').forEach(li => {
            const a = li.querySelector('a.card-content__title');
            if (a && a.href) out.push({ url: a.href, title: a.innerText.trim() });
          });
          // fallback to any card-content__title anchors
          if (out.length < 8) {
            document.querySelectorAll('a.card-content__title').forEach(a => {
              if (a && a.href) out.push({ url: a.href, title: a.innerText.trim() });
            });
          }
          return out.slice(0, 60);
        });
        await browser.close();
        if (items && items.length) return items;
      } catch (e) {
        console.warn('[marmitonSearchLinks] headless extraction failed', e && e.message);
        // fall through to static parsing
      }
    }
    try {
      const url = `https://www.marmiton.org/recettes/recherche.aspx?aqt=${encodeURIComponent(qraw)}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mon-Menu-Bot/1.0 (+https://example.local)' } });
      if (!resp.ok) return [];
      const html = await resp.text();
      const $ = cheerio.load(html);
      const local = new Map();
      // Prefer structured search-list items and card titles (more reliable)
      $('li.search-list__item').each((i, li) => {
        try {
          const a = $(li).find('a.card-content__title').first();
          if (!a || !a.attr('href')) return;
          const href = a.attr('href');
          const full = href.startsWith('http') ? href : new URL(href, url).toString();
          const title = a.text().trim();
          if (!title || title.length < 3) return;
          if (/recettes\/(top|dossier|recette-meme-auteur|recette-par|membres)/i.test(full)) return;
          local.set(full.split('#')[0], title);
        } catch (e) { /* ignore item */ }
      });

      // Also look for any standalone card-content__title anchors on the page
      if (local.size < 8) {
        $('a.card-content__title').each((i, a) => {
          try {
            const href = $(a).attr('href') || '';
            if (!href) return;
            const full = href.startsWith('http') ? href : new URL(href, url).toString();
            const title = $(a).text().trim();
            if (!title || title.length < 3) return;
            if (/recettes\/(top|dossier|recette-meme-auteur|recette-par|membres)/i.test(full)) return;
            local.set(full.split('#')[0], title);
          } catch (e) { }
        });
      }

      // Fallback regex pass (broader) if we still have few results
      if (local.size < 6) {
        const linkRe = /<a[^>]+href="([^"]*(?:recettes\/recette|recette[_-][^\"]*))"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = linkRe.exec(html)) !== null) {
          try {
            const rawHref = m[1];
            const anchorHtml = m[2].replace(/\s+/g, ' ').trim();
            const title = anchorHtml.replace(/<[^>]+>/g, '').trim();
            const full = rawHref.startsWith('http') ? rawHref : new URL(rawHref, url).toString();
            if (/recettes\/(top|dossier|recette-meme-auteur|recette-par|membres)/i.test(full)) continue;
            if (!title || title.length < 3) continue;
            local.set(full.split('#')[0], title);
            if (local.size >= 30) break;
          } catch (e) { continue; }
        }
      }

      const out = [];
      for (const [u,t] of local.entries()) {
        out.push({ url: u, title: t });
        if (out.length >= 30) break;
      }
      console.log('[marmitonSearchLinks] found', out.length, out.map(x=>x.title).slice(0,20));
      return out;
    } catch (e) { return []; }
  }
  if (domain.includes('marmiton')) {
    candidates.push(`https://www.marmiton.org/recettes/recherche.aspx?aqt=${q}`);
  }
  if (domain.includes('jow')) {
    candidates.push(`https://www.jow.fr/recipes?search=${q}`);
    candidates.push(`https://www.jow.fr/search?query=${q}`);
    candidates.push(`https://www.jow.fr/?s=${q}`);
  }
  if (domain.includes('irealime')) {
    candidates.push(`https://www.irealime.com/?s=${q}`);
    candidates.push(`https://irealime.com/?s=${q}`);
  }

  const links = new Set();
  const recipeUrlRe = /recettes\/recette|recette[_-].*_[0-9]+|recette[_-][0-9]+|recette-[0-9]+/i;
      for (const url of candidates) {
    try {
      // If domain is marmiton, try direct parsing of its search results first
      if (url.includes('marmiton.org')) {
        const more = await marmitonSearchLinks(q);
        more.forEach(obj => links.add(typeof obj === 'string' ? obj : JSON.stringify(obj)));
      }
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mon-Menu-Bot/1.0 (+https://example.local)' } });
      if (!resp.ok) continue;
      const html = await resp.text();
      const $ = cheerio.load(html);

      // Collect anchors that look like recipe links
      $('a[href]').each((i, a) => {
        const href = $(a).attr('href');
        if (!href) return;
        const normalized = href.startsWith('http') ? href : new URL(href, url).toString();
        try {
          const u = new URL(normalized);
          if (!u.hostname.includes(new URL(url).hostname)) return;
        } catch (e) {
          return;
        }
        // heuristic: url contains "recette" or "recettes" or "/recipe" or numeric id
        if (/recett|recipe|\/r\/|\/recipes\//i.test(normalized) || /-[0-9]{2,}/.test(normalized)) {
          // For Marmiton, require the URL to match recipeUrlRe to avoid collections
          if (normalized.includes('marmiton.org') && !recipeUrlRe.test(normalized)) return;
          // blacklist common non-recipe paths (login, category, user space)
          if (/espace|connexion|login|inscription|categorie|index|account|user|mon-carnet|newsletter|categorie|tag|tagged/i.test(normalized)) return;
          links.add(normalized.split('#')[0]);
        }
      });
      // Validate collected links by checking for recipe signals (JSON-LD or keywords)
      const validated = new Set();
      for (const l of Array.from(links)) {
        try {
          const r = await fetch(l, { headers: { 'User-Agent': 'Mon-Menu-Bot/1.0 (+https://example.local)' } });
          if (!r.ok) continue;
          const h = await r.text();
          // For Marmiton, ensure the URL looks like a direct recipe URL
          if (l.includes('marmiton.org') && !recipeUrlRe.test(l)) continue;
          if (/application\/ld\+json/i.test(h) || /ingr[eé]dient|pr[eé]paration|ingr[eé]dients|pr[eé]paration/i.test(h)) {
            validated.add(l);
          }
          // polite delay
          await new Promise(r => setTimeout(r, 80));
        } catch (e) {
          continue;
        }
      }
      // replace links with validated ones
      links.clear();
      for (const v of validated) links.add(v);
      // If we already have some links, stop early
      if (links.size >= 20) break;
      // polite delay
      await new Promise(r => setTimeout(r, 120));
    } catch (err) {
      continue;
    }
  }

  // Return up to 15 candidate links per domain (more aggressive to match site search results)
  // Return array of link objects or strings
  return Array.from(links).slice(0, 15).map(s => {
    try { return JSON.parse(s); } catch (e) { return s; }
  });
}

// /api/search?q=...
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  console.log('[search] query=', q);

  const cacheKey = 'search:' + q.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return res.json({ results: cached });

  console.log('[search] cache miss for', cacheKey);

  // If LIVE_SEARCH enabled and SERPAPI_KEY is provided, perform live search
  if (LIVE_SEARCH && SERPAPI_KEY) {
    try {
      const serp = await fetchSerpApi(q);
      const organic = serp.organic_results || serp.organic || [];
      const results = [];
      for (const item of organic.slice(0, 6)) {
        const link = item.link || item.url || item.source || item.position_url;
        if (!link) continue;
        const extracted = await extractRecipeFromUrl(link);
        if (extracted) results.push(extracted);
        // Small delay to be polite
        await new Promise(r => setTimeout(r, 120));
      }
      setCached(cacheKey, results);
      return res.json({ results });
    } catch (err) {
      console.error('Live search failed:', err.message || err);
      // fallback to mock
    }
  }

  // When LIVE_SEARCH not used, try site-specific scraping for the target domains
  const targetDomains = ['marmiton.org','jow.fr','irealime.com'];
  const collected = [];
  for (const domain of targetDomains) {
    try {
      const cacheKeySite = `site:${domain}:` + q.toLowerCase();
      const cachedSite = getCached(cacheKeySite);
      let links = cachedSite;
      if (!links) {
        links = await findLinksFromSearch(domain, q);
        setCached(cacheKeySite, links, 10 * 60 * 1000);
      }
      for (const linkObj of (links || []).slice(0,12)) {
        const href = typeof linkObj === 'string' ? linkObj : linkObj.url;
        const preTitle = typeof linkObj === 'object' ? (linkObj.title || '') : '';
        const cacheKey = 'page:' + href;
        // For Marmiton, skip non-recipe pages early based on URL pattern
        try {
          if (href && href.includes('marmiton.org') && !recipeUrlRe.test(href)) {
            continue;
          }
        } catch (e) {}
        let extracted = getCached(cacheKey);
        if (!extracted) {
          extracted = await extractRecipeFromUrl(href);
          if (extracted) setCached(cacheKey, extracted, 60 * 60 * 1000);
        }
        if (extracted) {
          // fill missing title from preTitle when available
          if ((!extracted.title || extracted.title.trim()==='') && preTitle) extracted.title = preTitle;
          collected.push(extracted);
        } else if (preTitle) {
          // Only create a lightweight item if the URL looks like a real recipe (avoid collections)
          try {
            const u = new URL(href);
            const hostname = u.hostname || '';
            const recipeUrlRe = /recettes\/recette|recette[_-].*_[0-9]+|recette[_-][0-9]+|recette-[0-9]+/i;
            if (hostname.includes('marmiton.org')) {
              if (recipeUrlRe.test(href)) {
                collected.push({ title: preTitle, url: href, source: hostname, ingredients: [], preparation: [] });
              } else {
                // skip generic/collection links for Marmiton
              }
            } else {
              // For other sites, still allow lightweight item (less noisy)
              collected.push({ title: preTitle, url: href, source: hostname, ingredients: [], preparation: [] });
            }
          } catch (e) {
            // if URL parsing fails, skip
          }
        }
        // politeness
        await new Promise(r => setTimeout(r, 180));
      }
    } catch (err) {
      console.warn('site scrape error', domain, err.message || err);
    }
    // Stop early if we collected enough
    if (collected.length >= 6) break;
  }

  if (collected.length > 0) {
    console.log('[search] collected recipes count=', collected.length);
    console.log('[search] collected titles=', collected.map(i=>i.title).slice(0,20));
    // Remove Marmiton items whose URL does not match a recipe URL pattern
    const globalRecipeUrlRe = /recettes\/recette|recette[_-].*_[0-9]+|recette[_-][0-9]+|recette-[0-9]+/i;
    const beforeFilter = collected.length;
    const filteredByUrl = collected.filter(it => {
      try {
        if (!it || !it.url) return false;
        const src = (it.source || '').toString().toLowerCase();
        if (src.includes('marmiton.org')) {
          return globalRecipeUrlRe.test(it.url);
        }
        return true;
      } catch (e) { return false; }
    });
    if (filteredByUrl.length !== beforeFilter) {
      console.log('[search] removed non-recipe marmiton urls:', beforeFilter - filteredByUrl.length);
    }
    // use filteredByUrl as the new collected set for downstream processing
    const collectedFiltered = filteredByUrl;
    // Remove generic or non-recipe titles (login, category pages)
    function isGenericTitle(t) {
      if (!t) return true;
      const s = t.toString().toLowerCase();
      if (/se connecter|connexion|se-connecter|espace perso|mon carnet|recettes?$|recettes index|recettes entree|recettes plat|categorie|catégorie|liste des recettes|recettes par|voir toutes/i.test(s)) return true;
      if (s.trim().length < 3) return true;
      return false;
    }
    const cleanedCollected = collectedFiltered.filter(it => !isGenericTitle(it.title));

    if (cleanedCollected.length === 0) {
      // if nothing sensible after cleaning, fallback to mock below
    }
    // Use cleanedCollected for scoring
    const sourceCollection = cleanedCollected.length > 0 ? cleanedCollected : collected;
    // Relevance filtering: keep only recipes that mention the query in title, ingredients or preparation
    function normalize(s) {
      if (!s) return '';
      return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    }
    const terms = q.toLowerCase().split(/\s+/).filter(t => t.length >= 2).map(t => t.normalize('NFD').replace(/\p{Diacritic}/gu, ''));
    // Strict pre-filter: require at least one search term to appear in title OR ingredients
    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function wholeWordMatch(text, token) {
      if (!text) return false;
      try {
        const re = new RegExp('\\b' + escapeRegExp(token) + '\\b', 'i');
        return re.test(text);
      } catch (e) { return text.includes(token); }
    }

    const filtered = sourceCollection.filter(item => {
      const title = normalize(item.title || '');
      const ing = (item.ingredients || []).map(i => normalize(i.name || i.raw || i)).join(' ');
      const url = (item.url || '').toString().toLowerCase();
      // For single-term queries, require a whole-word match in title OR the token in URL
      if (terms.length === 1) {
        const t = terms[0];
        if (wholeWordMatch(title, t)) return true;
        if (url && url.includes(t)) return true;
        // also allow match in ingredients if very explicit
        if (wholeWordMatch(ing, t)) return true;
        return false;
      }
      // For multi-term queries, allow if any term in title or ingredients
      return terms.some(t => title.includes(t) || ing.includes(t));
    });

    console.log('[search] filtered count=', filtered.length, 'titles=', filtered.map(i=>i.title).slice(0,10));

    if (filtered.length === 0) {
      // nothing strictly matching the query — attempt a fallback using search-page titles
      console.log('[search] no strict matches for', q, '- attempting fallback from search pages');
      try {
        const fallbackLinks = await findLinksFromSearch('marmiton.org', q);
        const items = (fallbackLinks || []).map(l => {
          if (typeof l === 'string') return { title: l, url: l, source: 'www.marmiton.org', ingredients: [], preparation: [] };
          return { title: l.title || '', url: l.url || '', source: 'www.marmiton.org', ingredients: [], preparation: [] };
        });
        // filter fallback items: prefer items whose title contains the full phrase or all tokens
        const fullPhrase = normalize(q);
        const byPhrase = items.filter(it => it.title && normalize(it.title).includes(fullPhrase));
        let fallbackFiltered = byPhrase;
        if (fallbackFiltered.length === 0) {
          fallbackFiltered = items.filter(it => terms.every(t => normalize(it.title || '').includes(t)));
        }
        if (fallbackFiltered.length === 0) {
          // looser: any item with at least one token in title
          fallbackFiltered = items.filter(it => terms.some(t => normalize(it.title || '').includes(t)));
        }
        if (fallbackFiltered.length > 0) {
          // Use these as results (lightweight items)
          setCached(cacheKey, fallbackFiltered.slice(0,8));
          console.log('[search] fallback returning', fallbackFiltered.length, 'items');
          return res.json({ results: fallbackFiltered.slice(0,8) });
        }
      } catch (e) {
        console.warn('[search] fallback failed', e && e.message);
      }
      setCached(cacheKey, []);
      console.log('[search] no strict matches for', q);
      return res.json({ results: [] });
    }

    const fullPhrase = normalize(q);
    const scored = filtered.map(item => {
      const title = normalize(item.title || '');
      const ing = (item.ingredients || []).map(i => normalize(i.name || i.raw || i)).join(' ');
      const prep = (item.preparation || []).map(p => normalize(p)).join(' ');
      let score = 0;
      // Big boost for exact phrase match in title
      if (fullPhrase && title.includes(fullPhrase)) score += 10;
      for (const t of terms) {
        if (title.includes(t)) score += 3;
        if (ing.includes(t)) score += 2;
        if (prep.includes(t)) score += 1;
      }
      return { item, score };
    }).filter(s => s.score > 0);

    // If none matched, as a fallback attempt looser match (allow partial tokens)
    let final = scored;
    if (final.length === 0) {
      final = collected.map(item => {
        const title = normalize(item.title || '');
        let score = 0;
        for (const t of terms) {
          if (title.includes(t)) score += 2;
        }
        return { item, score };
      }).filter(s => s.score > 0);
    }

    // Sort by score desc
    final.sort((a,b) => b.score - a.score);
    let results = final.map(f => f.item).slice(0, 8);
    // If still empty, but we have sourceCollection, return top sourceCollection (best effort)
    if (results.length === 0 && sourceCollection.length > 0) {
      results = sourceCollection.slice(0,8);
    }
    setCached(cacheKey, results);
    console.log('[search] returning', results.length, 'results');
    return res.json({ results });
  }

  // No relevant recipes found — return empty results to avoid unrelated mock
  console.log('[search] no collected recipes, returning empty results');
  setCached(cacheKey, []);
  return res.json({ results: [] });
});

// Favorites API (server-backed) - GET/POST/DELETE
app.get('/api/favorites', (req, res) => {
  const favs = readFavorites();
  return res.json({ favorites: favs });
});

app.post('/api/favorites', (req, res) => {
  const data = req.body || {};
  if (!data || !data.url) return res.status(400).json({ error: 'missing url' });
  const favs = readFavorites();
  if (!favs.some(f => f.url === data.url)) {
    const toSave = { title: data.title || data.name || '', url: data.url, time: data.time || '', calories: data.calories || '', ingredients: data.ingredients || [] };
    favs.unshift(toSave);
    writeFavorites(favs);
  }
  return res.json({ favorites: readFavorites() });
});

app.delete('/api/favorites', (req, res) => {
  const url = req.query.url || (req.body && req.body.url) || '';
  if (!url) return res.status(400).json({ error: 'missing url' });
  const favs = readFavorites().filter(f => f.url !== url);
  writeFavorites(favs);
  return res.json({ favorites: favs });
});

app.listen(port, () => {
  console.log(`Search API and static server running at http://localhost:${port} (LIVE_SEARCH=${LIVE_SEARCH})`);
});
