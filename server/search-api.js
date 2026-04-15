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
        const m2 = raw.match(/^([0-9\/\,\.\s\/]*)\s+(.*)$/);
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
