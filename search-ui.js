// search-ui.js — frontend for recipe search (mock + API fallback)
(function(){
  const form = document.getElementById('recipe-search-form');
  const input = document.getElementById('recipe-search-input');
  const resultsContainer = document.getElementById('search-results');
  const debounce = (fn, wait) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  // Track API availability to avoid repeated failing requests (reduces console 404 noise)
  let API_AVAILABLE = null; // null=unknown, true/false = known
  function getApiBaseForClient() {
    let apiBase = (window && window.API_BASE) ? String(window.API_BASE).replace(/\/$/, '') : '';
    const low = (apiBase || '').toString().toLowerCase();
    if (low.includes('replace') || low.includes('replace_with') || low.includes('your_api')) apiBase = '';
    return apiBase;
  }

  function createCard(recipe, isFav) {
    const ingredientsHtml = (recipe.ingredients || []).slice(0,12).map(i => `<li><b>${i.quantity || i.quantite || ''} ${i.unit||i.unite||''}</b> ${i.name||i.nom||i.raw||''}</li>`).join('');
    const preparationHtml = (recipe.preparation || recipe.steps || []).slice(0,6).map((s,idx) => `<li><b>Étape ${idx+1}:</b> ${s}</li>`).join('');
    const sourceHost = recipe.source || (recipe.url ? new URL(recipe.url).hostname : 'externe');
    return `
      <div class="meal-card external ${isFav ? 'is-favorite' : ''}" data-url="${recipe.url||''}" data-title="${(recipe.title||recipe.name||'').replace(/"/g,'&quot;')}">
        <button class="btn-swap">🔗</button>
        <button class="btn-fav-delete" title="Supprimer des favoris">🗑️</button>
        <div class="meal-header">
          <div class="meal-icon">🍝</div>
          <div class="meal-info">
            <span class="meal-type">Externe</span>
            <h4 class="meal-name">${recipe.title || recipe.name || ''}</h4>
            <span class="meal-time">⏱ ${recipe.time || recipe.temps || '-'} • 🔥 ${recipe.calories || '-'}</span>
          </div>
        </div>
        <div class="meal-details">
          <div class="meal-actions" style="display:flex; gap:0.5rem; justify-content:flex-end; margin-bottom: 1rem; border-bottom: 1px dashed var(--ingredient-border); padding-bottom: 1rem; flex-wrap:wrap;">
            <button class="btn-action" data-action="add">➕ Ajouter au menu</button>
              <button class="btn-marmiton btn-action" data-action="view">🍲 Voir sur Marmiton</button>
          </div>
          <h5 style="margin-bottom:0.5rem; color:var(--primary-color)">🧂 Ingrédients</h5>
          <ul style="list-style:none; font-size:0.9rem; color:var(--text-dark)">
            ${ingredientsHtml || '<li style="color:var(--text-muted)">Aucun ingrédient extrait</li>'}
          </ul>
          ${preparationHtml ? `<div style="margin-top:1rem;"><h5 style="margin-bottom:0.5rem; color:var(--primary-color)">👩‍🍳 Préparation</h5><ul style="list-style:none; font-size:0.9rem; color:var(--text-dark)">${preparationHtml}</ul></div>` : ''}
          <div style="margin-top:1rem; padding:0.5rem; background:var(--astuce-bg); border-radius:0.5rem; font-size:0.85rem; color:var(--astuce-color)">
            💡 <b>Astuce :</b> Vérifie les quantités et unités après ajout au menu.
          </div>
        </div>
      </div>
    `;
  }

  async function renderResults(list) {
    // Deduplicate incoming results (avoid duplicate recipes shown)
    try {
      const seen = new Set();
      const unique = [];
      for (const r of list || []) {
        const key = (r && (r.url || r.link || r.title || r.name) || '').toString();
        if (key) {
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(r);
        } else {
          // fallback: stringify small snapshot to detect duplicates
          const k2 = JSON.stringify(r || {}).slice(0,200);
          if (seen.has(k2)) continue;
          seen.add(k2);
          unique.push(r);
        }
      }
      list = unique;
    } catch (e) { /* ignore dedupe errors and proceed with original list */ }

    resultsContainer.innerHTML = '';
    if (!list || list.length === 0) {
      resultsContainer.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center; padding:1rem;">Aucun résultat</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    // We'll reuse menu-grid styles by injecting cards as innerHTML
    const favs = await loadFavorites();
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-grid';
    wrapper.innerHTML = list.map(r => createCard(r, favs.some(f => f.url === (r.url || r.link)))).join('');

    // Attach event listeners to buttons inside
    wrapper.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const card = btn.closest('.meal-card');
        const title = card.querySelector('.meal-name').textContent;
        const matched = list.find(l => l.title === title || l.name === title);
        if (action === 'add') {
          if (window.addExternalRecipe) {
            window.addExternalRecipe(matched);
            addFavorite(matched);
          } else {
            localStorage.setItem('external-selected', JSON.stringify(matched));
            alert('Recette sauvegardée localement. Ouvrez le menu puis collez-la manuellement.');
          }
        } else if (action === 'view') {
          if (matched && matched.url) window.open(matched.url, '_blank');
        }
      });
    });

    resultsContainer.appendChild(wrapper);

    // Attach click handler per card to toggle expansion (prevents multiple cards opening)
    wrapper.querySelectorAll('.meal-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // prevent bubbling to other handlers
        e.stopPropagation();
        if (e.target.closest('.btn-swap')) return;

        // Delegate toggle behavior to app's toggleCuisine if available
        if (window.toggleCuisine && typeof window.toggleCuisine === 'function') {
          window.toggleCuisine(e, card);
        } else {
          // fallback local toggle
          const isExpanded = card.classList.contains('expanded');
          const container = resultsContainer;
          if (container) {
            container.querySelectorAll('.meal-card.expanded').forEach(c => {
              if (c !== card) c.classList.remove('expanded');
            });
          }
          if (isExpanded) card.classList.remove('expanded'); else card.classList.add('expanded');
        }
      });
    });

    // favorite delete handlers
    wrapper.querySelectorAll('.btn-fav-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.meal-card');
        const title = card.querySelector('.meal-name').textContent;
        const matched = list.find(l => l.title === title || l.name === title);
        if (matched && matched.url) {
          removeFavorite(matched.url);
          // update UI
          card.classList.remove('is-favorite');
          btn.style.display = 'none';
        }
      });
    });

    // After rendering results, also refresh favorites section
    renderFavorites();
  }

  // Favorites helpers (server-backed)
  async function loadFavorites() {
    try {
      const apiBase = getApiBaseForClient();
      if (API_AVAILABLE === false) throw new Error('api-unavailable');
      const url = apiBase ? `${apiBase}/api/favorites` : '/api/favorites';
      const res = await fetch(url);
      if (!res.ok) { API_AVAILABLE = false; throw new Error('no favs'); }
      API_AVAILABLE = true;
      const j = await res.json();
      return j.favorites || [];
    } catch (e) {
      try { API_AVAILABLE = false; return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch (_) { return []; }
    }
  }

  async function addFavorite(recipe) {
    if (!recipe || !recipe.url) return;
    const apiBase = getApiBaseForClient();
    if (API_AVAILABLE === false || !apiBase) {
      // fallback to localStorage only
      const favs = loadFavoritesSync();
      if (!favs.some(f => f.url === recipe.url)) {
        favs.unshift({ title: recipe.title || recipe.name, url: recipe.url, time: recipe.time || '', calories: recipe.calories || '', ingredients: recipe.ingredients || [] });
        localStorage.setItem('favorites', JSON.stringify(favs));
      }
    } else {
      try {
        const url = apiBase ? `${apiBase}/api/favorites` : '/api/favorites';
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(recipe) });
        if (!res.ok) { API_AVAILABLE = false; throw new Error('post failed'); }
        API_AVAILABLE = true;
      } catch (e) {
        API_AVAILABLE = false;
        const favs = loadFavoritesSync();
        if (!favs.some(f => f.url === recipe.url)) {
          favs.unshift({ title: recipe.title || recipe.name, url: recipe.url, time: recipe.time || '', calories: recipe.calories || '', ingredients: recipe.ingredients || [] });
          localStorage.setItem('favorites', JSON.stringify(favs));
        }
      }
    }
    // mark UI
    document.querySelectorAll('.meal-card').forEach(card => {
      const t = card.querySelector('.meal-name')?.textContent;
      if (t === (recipe.title || recipe.name)) card.classList.add('is-favorite');
    });
    renderFavorites();
  }

  async function removeFavorite(url) {
    if (!url) return;
    const apiBase = getApiBaseForClient();
    if (API_AVAILABLE === false || !apiBase) {
      const favs = loadFavoritesSync().filter(f => f.url !== url);
      localStorage.setItem('favorites', JSON.stringify(favs));
    } else {
      try {
        const full = apiBase ? `${apiBase}/api/favorites?url=${encodeURIComponent(url)}` : `/api/favorites?url=${encodeURIComponent(url)}`;
        const res = await fetch(full, { method: 'DELETE' });
        if (!res.ok) { API_AVAILABLE = false; throw new Error('delete failed'); }
        API_AVAILABLE = true;
      } catch (e) {
        API_AVAILABLE = false;
        const favs = loadFavoritesSync().filter(f => f.url !== url);
        localStorage.setItem('favorites', JSON.stringify(favs));
      }
    }
    // update UI
    document.querySelectorAll('.meal-card').forEach(card => {
      const t = card.querySelector('.meal-name')?.textContent;
      if (t) {
        // no-op
      }
    });
    renderFavorites();
  }

  function loadFavoritesSync() { try { return JSON.parse(localStorage.getItem('favorites')||'[]'); } catch(e){return [];} }

  async function renderFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    const favs = await loadFavorites();
    container.innerHTML = '';
    if (!favs || favs.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);">Aucun favori pour le moment.</p>';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'menu-grid';
    wrap.innerHTML = favs.map(f => createCard(f, true)).join('');
    container.appendChild(wrap);
    // Attach delete handlers for favorites view
    wrap.querySelectorAll('.btn-fav-delete').forEach(btn => {
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const card = btn.closest('.meal-card');
        const title = card.querySelector('.meal-name').textContent;
        const matched = favs.find(ff => ff.title === title || ff.url === title);
        if (matched && matched.url) {
          await removeFavorite(matched.url);
        }
      });
    });

    // Attach action button handlers (add/view) to favorites cards
    wrap.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const card = btn.closest('.meal-card');
        const title = card.querySelector('.meal-name').textContent;
        const matched = favs.find(l => l.title === title || l.name === title || l.url === title);
        if (action === 'add') {
          if (window.addExternalRecipe) {
            window.addExternalRecipe(matched);
          } else {
            localStorage.setItem('external-selected', JSON.stringify(matched));
            alert('Recette sauvegardée localement. Ouvrez le menu puis collez-la manuellement.');
          }
        } else if (action === 'view') {
          if (matched && matched.url) window.open(matched.url, '_blank');
        }
      });
    });

    // Open favorites in a centered modal to avoid expanding entire row
    wrap.querySelectorAll('.meal-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.btn-swap')) return;
        const title = card.dataset.title || card.querySelector('.meal-name')?.textContent;
        const url = card.dataset.url || (card.querySelector('a') && card.querySelector('a').href) || '';
        console.debug('[favorites] card clicked title=', title, 'url=', url);
        // prefer matching by URL
        let matched = null;
        if (url) matched = favs.find(ff => ff.url === url);
        if (!matched && title) matched = favs.find(ff => ff.title === title || ff.name === title || ff.url === title);
        // If we didn't find a match in the loaded favorites, build a minimal recipe from the card DOM
        if (!matched) {
          const timeText = card.querySelector('.meal-time')?.textContent || '';
          const ingEls = Array.from(card.querySelectorAll('ul li'));
          const ingredients = ingEls.map(li => ({ raw: li.textContent.trim() }));
          matched = { title: title || card.querySelector('.meal-name')?.textContent || 'Recette', url: url || '', time: timeText.replace(/\n/g,' ').trim(), ingredients, preparation: [] };
          console.debug('[favorites] built recipe from card', matched);
        }
        if (matched) showRecipeModal(matched);
      });
    });
  }

  // Modal helpers
  function buildModalHtml(recipe) {
    const ingredientsHtml = (recipe.ingredients || []).map(i => `<li>${(i.quantity||i.quantite||'') + (i.unit?(' '+i.unit):'')} ${i.name||i.raw||''}</li>`).join('');
    const prepHtml = (recipe.preparation || recipe.steps || []).map((s,idx)=>`<li><b>Étape ${idx+1}:</b> ${s}</li>`).join('');
    return `
      <div style="display:flex; gap:1rem; align-items:flex-start;">
        <div style="flex:0 0 72px;">
          <div class="meal-icon" style="width:72px;height:72px;font-size:2.25rem;display:flex;align-items:center;justify-content:center;border-radius:0.75rem;">🍝</div>
        </div>
        <div style="flex:1;">
          <h4 style="margin:0 0 0.5rem;">${recipe.title || recipe.name || ''}</h4>
          <div style="color:var(--text-muted); margin-bottom:0.5rem;">⏱ ${recipe.time || '-'} • 🔥 ${recipe.calories || '-'}</div>
          <h5 style="margin:0.25rem 0; color:var(--primary-color)">🧂 Ingrédients</h5>
          <ul style="margin:0 0 0.5rem 1rem; color:var(--text-dark);">${ingredientsHtml||'<li style="color:var(--text-muted)">Aucun ingrédient extrait</li>'}</ul>
          ${prepHtml?`<div style="margin-top:0.5rem;"><h5 style="margin:0.25rem 0; color:var(--primary-color)">👩‍🍳 Préparation</h5><ul style="margin:0 0 0 1rem;">${prepHtml}</ul></div>`:''}
        </div>
      </div>
    `;
  }

  function showRecipeModal(recipe) {
    console.debug('[recipe-modal] show for', recipe && (recipe.url || recipe.title));
    const modal = document.getElementById('recipe-modal');
    const titleEl = document.getElementById('recipe-modal-title');
    const body = document.getElementById('recipe-modal-body');
    const addBtn = document.getElementById('recipe-modal-add');
    const viewBtn = document.getElementById('recipe-modal-view');
    if (!modal || !body) return;
    titleEl.textContent = recipe.title || recipe.name || 'Recette';
    body.innerHTML = buildModalHtml(recipe);
    // set view url
    viewBtn.onclick = () => { if (recipe.url) window.open(recipe.url, '_blank'); };
    addBtn.onclick = () => { if (window.addExternalRecipe) window.addExternalRecipe(recipe); addFavorite(recipe); hideRecipeModal(); };
    // close handlers
    document.getElementById('recipe-modal-close').onclick = hideRecipeModal;
    modal.onclick = (e) => { if (e.target === modal) hideRecipeModal(); };
    modal.classList.remove('hidden');
    // ensure CSS that uses .active shows the modal (opacity/pointer-events)
    modal.classList.add('active');
  }

  function hideRecipeModal() {
    const modal = document.getElementById('recipe-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }

  // Expose modal helpers for debugging from DevTools
  try { window.showRecipeModal = showRecipeModal; window.hideRecipeModal = hideRecipeModal; } catch(e) { /* ignore in some contexts */ }

  async function fetchSearch(q) {
    if (!q || q.trim().length < 2) return [];
    try {
      // Allow overriding the API base from the page (e.g. set window.API_BASE = 'https://api.example.com')
      let apiBase = (window && window.API_BASE) ? String(window.API_BASE).replace(/\/$/, '') : '';
      // Treat placeholder or unreplaced values as empty so we don't attempt invalid cross-origin calls
      const low = (apiBase || '').toString().toLowerCase();
      if (low.includes('replace') || low.includes('replace_with') || low.includes('your_api')) apiBase = '';
      const apiUrl = apiBase ? `${apiBase}/api/search?q=${encodeURIComponent(q)}` : `/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('API response not ok');
      const json = await res.json();
      return json.results || json || [];
    } catch (err) {
      // If API is not available (404 / CORS / network), fall back to a local static JSON
      try {
        // Try relative path first (works when app is hosted under a subpath),
        // then fall back to root-based path.
        let mockRes = await fetch('mock-recipes.json');
        if (!mockRes || !mockRes.ok) {
          mockRes = await fetch('/mock-recipes.json');
        }
        if (mockRes && mockRes.ok) {
          const arr = await mockRes.json();
          const qn = q.toString().toLowerCase();
          const filtered = (arr || []).filter(item => {
            try {
              const title = (item.title || item.name || '').toString().toLowerCase();
              const ing = (item.ingredients || []).map(i => (i.name || i.raw || '')).join(' ').toLowerCase();
              const url = (item.url || '').toString().toLowerCase();
              return title.includes(qn) || ing.includes(qn) || url.includes(qn);
            } catch (e) { return false; }
          });
          return filtered;
        }
      } catch (e) {
        // ignore
      }
      console.warn('Recherche API échouée, aucun résultat', err);
      return [];
    }
  }

  const doSearch = debounce(async (evt) => {
    const q = input.value.trim();
    if (q.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }
    const results = await fetchSearch(q);
    renderResults(results);
  }, 350);

  input.addEventListener('input', doSearch);
  form.addEventListener('submit', async (e) => { e.preventDefault(); await doSearch(); });

  // Render favorites on initial load so the favorites-section is populated
  // even before the first search is performed.
  renderFavorites();

})();
