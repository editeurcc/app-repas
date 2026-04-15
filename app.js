document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');
    const shoppingListContainer = document.getElementById('shopping-list-container');
    const btnRegenerer = document.getElementById('btn-regenerer');
    const btnCopy = document.getElementById('btn-copy');
    const btnUncheckAll = document.getElementById('btn-uncheck-all');
    const toastContainer = document.getElementById('toast-container');

    let currentMenu = null;
    let checkedItems = new Set(); // Pour stocker les articles du cellier/déjà possédés
    let excludedMeals = new Set(); // Pour stocker les recettes retirées des courses

    /**
     * Affiche une notification toast
     */
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Alterne le mode cuisine (expansion de la carte)
     */
    window.toggleCuisine = (event, element) => {
        // Ne pas déclencher si on clique sur le bouton de swap
        if (event.target.closest('.btn-swap')) return;
        
        const isExpanded = element.classList.contains('expanded');
        
        // Fermer les autres cartes ouvertes
        document.querySelectorAll('.meal-card.expanded').forEach(card => {
            if (card !== element) card.classList.remove('expanded');
        });

        element.classList.toggle('expanded');
    };

    /**
     * Remplace un repas spécifique sans changer le reste du menu
     */
    window.swapRecipe = (event, dayIndex, mealType) => {
        event.stopPropagation();
        
        const usedIds = new Set();
        currentMenu.jours.forEach(j => {
            if (j.midi) usedIds.add(j.midi.id);
            if (j.soir) usedIds.add(j.soir.id);
        });

        const currentMeal = currentMenu.jours[dayIndex][mealType];
        const newMeal = piocherRecetteAlternative(usedIds, currentMeal.categorie, mealType);

        if (newMeal) {
            currentMenu.jours[dayIndex][mealType] = newMeal;
            renderMenu(false); // Render sans régénérer tout le menu
            showToast("✨ Recette remplacée !");
        }
    };

    /**
     * Gère le marquage des articles de la liste
     */
    window.togglePantry = (itemKey) => {
        if (checkedItems.has(itemKey)) {
            checkedItems.delete(itemKey);
        } else {
            checkedItems.add(itemKey);
        }
        renderShoppingList();
    };

    /**
     * Imprime spécifiquement une carte recette
     */
    window.printRecipe = (event, btn) => {
        event.stopPropagation();
        const card = btn.closest('.meal-card');
        
        // Create an isolated container for printing
        const printContainer = document.createElement('div');
        printContainer.id = 'print-container';
        
        // Clone the card to safely alter its styles
        const clonedCard = card.cloneNode(true);
        
        // Hide interactive logic on the printed version
        const actions = clonedCard.querySelector('.meal-actions');
        const swapBtn = clonedCard.querySelector('.btn-swap');
        if (actions) actions.style.display = 'none';
        if (swapBtn) swapBtn.style.display = 'none';
        
        // Force the card to be fully expanded for print
        clonedCard.classList.add('expanded');
        
        printContainer.appendChild(clonedCard);
        document.body.appendChild(printContainer);
        
        document.body.classList.add('printing-mode');
        
        window.print();
        
        // Cleanup after printing
        document.body.classList.remove('printing-mode');
        document.body.removeChild(printContainer);
    };

    /**
     * Coche les ingrédients d'une recette dans la liste globale
     */
    window.checkAllIngredients = (event, btn, dayIndex, mealType) => {
        event.stopPropagation();
        const repas = currentMenu.jours[dayIndex][mealType];
        if (!repas) return;

        const currentShoppingList = calculerListeDeCourses(currentMenu);
        
        repas.ingredients.forEach(ing => {
            const matchedItem = currentShoppingList.find(item => 
                item.nom.toLowerCase() === ing.nom.toLowerCase() && 
                item.unite.toLowerCase() === ing.unite.toLowerCase()
            );
            
            if (matchedItem) {
                const itemKey = `${matchedItem.nom}-${matchedItem.rayon}`;
                checkedItems.add(itemKey);
            }
        });
        
        btn.textContent = "✅ Tout est coché !";
        renderShoppingList();
        showToast("✅ Ingrédients cochés dans la liste !");
    };

    function renderMealCard(repas, type, dayIndex) {
        if (!repas) return '';
        const typeClass = type.toLowerCase();
        const mealTypeProperty = type.toLowerCase(); // 'midi' or 'soir'
        
        const ingredientsHtml = (repas.ingredients || [])
            .map(i => `<li><b>${i.quantite || ''} ${i.unite && i.unite !== 'pièce' && i.unite !== 'pièces' ? i.unite : ''}</b> ${i.nom || i.name || i.raw || ''}</li>`)
            .join('');

        const preparationHtml = (repas.preparation || [])
            .map((s, idx) => `<li><b>Étape ${idx+1}:</b> ${s}</li>`).join('');

        return `
            <div class="meal-card ${typeClass}" onclick="toggleCuisine(event, this)">
                <button class="btn-swap" onclick="swapRecipe(event, ${dayIndex}, '${mealTypeProperty}')" title="Changer cette recette">🔄</button>
                <div class="meal-header">
                    <div class="meal-icon">${repas.icone}</div>
                    <div class="meal-info">
                        <span class="meal-type">${type}</span>
                        <h4 class="meal-name">${repas.nom}</h4>
                        <span class="meal-time">⏱ ${repas.tempsPreparation} min • 🔥 ${repas.calories} kcal</span>
                    </div>
                </div>
                <div class="meal-details">
                    <div class="meal-actions" style="display:flex; gap:0.5rem; justify-content:flex-end; margin-bottom: 1rem; border-bottom: 1px dashed var(--ingredient-border); padding-bottom: 1rem; flex-wrap: wrap;">
                        <button class="btn-action" onclick="checkAllIngredients(event, this, ${dayIndex}, '${mealTypeProperty}')">✨ Puisé dans mon cellier</button>
                        <button class="btn-action" onclick="printRecipe(event, this)">🖨️ Imprimer</button>
                    </div>
                    <h5 style="margin-bottom:0.5rem; color:var(--primary-color)">🧂 Ingrédients</h5>
                    <ul style="list-style:none; font-size:0.9rem; color:var(--text-dark)">
                        ${ingredientsHtml}
                    </ul>
                    ${preparationHtml ? `<div style="margin-top:1rem;"><h5 style="margin-bottom:0.5rem; color:var(--primary-color)">👩‍🍳 Préparation</h5><ul style="list-style:none; font-size:0.9rem; color:var(--text-dark)">${preparationHtml}</ul></div>` : ''}
                    <div style="margin-top:1rem; padding:0.5rem; background:var(--astuce-bg); border-radius:0.5rem; font-size:0.85rem; color:var(--astuce-color)">
                        💡 <b>Astuce :</b> Préparez tous les ingrédients avant de commencer la cuisson pour gagner du temps.
                    </div>
                </div>
            </div>
        `;
    }

    function renderMenu(shouldRegenerate = true) {
        if (shouldRegenerate) {
            currentMenu = genererMenuSemaine();
            checkedItems.clear();
            excludedMeals.clear();
            
            // On initialise le cellier de base une SEULE FOIS au chargement du menu !
            const initialList = calculerListeDeCourses(currentMenu);
            initialList.forEach(item => {
                if (item.estCellier) {
                    checkedItems.add(`${item.nom}-${item.rayon}`);
                }
            });
        }
        
        menuContainer.innerHTML = '';
        currentMenu.jours.forEach((jour, idx) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.innerHTML = `
                <h3 class="day-title">${jour.jour}</h3>
                <div class="meals-container">
                    ${renderMealCard(jour.midi, 'Midi', idx)}
                    ${renderMealCard(jour.soir, 'Soir', idx)}
                </div>
            `;
            menuContainer.appendChild(dayCard);
        });

        renderShoppingList();
    }

    function renderShoppingList() {
        const currentShoppingList = calculerListeDeCourses(currentMenu);
        shoppingListContainer.innerHTML = '';
        
        if (currentShoppingList.length === 0) {
            shoppingListContainer.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem; font-size: 1.1rem;">🎉 Votre liste est vide !</p>';
            return;
        }

        const grouped = currentShoppingList.reduce((acc, item) => {
            if (!acc[item.rayon]) acc[item.rayon] = [];
            acc[item.rayon].push(item);
            return acc;
        }, {});

        for (const [rayonKey, items] of Object.entries(grouped)) {
            const section = document.createElement('div');
            section.className = 'shopping-category';
            const label = LABELS_RAYONS[rayonKey] || rayonKey;
            
            section.innerHTML = `
                <h4 class="category-title">${label}</h4>
                <ul class="ingredient-list">
                    ${items.map(item => {
                        const itemKey = `${item.nom}-${item.rayon}`;
                        // On vérifie UNIQUEMENT si la case est cochée manuellement ou par le clique !
                        // C'est ce qui corrige le bug du "impossible de décocher"
                        const isChecked = checkedItems.has(itemKey);

                        return `
                            <li class="${isChecked ? 'is-cellier' : ''}">
                                <div style="display:flex; align-items:center">
                                    <input type="checkbox" class="pantry-toggle" ${isChecked ? 'checked' : ''} onchange="togglePantry('${itemKey}')">
                                    <span class="ing-name">${item.nom.charAt(0).toUpperCase() + item.nom.slice(1)}</span>
                                </div>
                                <span class="ing-qty">${item.quantite} ${item.unite !== 'pièce' && item.unite !== 'pièces' ? item.unite : ''}</span>
                            </li>
                        `;
                    }).join('')}
                </ul>
            `;
            shoppingListContainer.appendChild(section);
        }
    }

    btnRegenerer.addEventListener('click', () => {
        renderMenu();
        showToast("🥣 Nouveau menu généré !");
    });

    btnCopy.addEventListener('click', () => {
        const list = calculerListeDeCourses(currentMenu);
        let text = "🛒 MA LISTE DE COURSES 🛒\n\n";
        
        const grouped = list.reduce((acc, item) => {
            if (!acc[item.rayon]) acc[item.rayon] = [];
            acc[item.rayon].push(item);
            return acc;
        }, {});

        for (const [rayonKey, items] of Object.entries(grouped)) {
            const label = LABELS_RAYONS[rayonKey] || rayonKey;
            const relevantItems = items.filter(item => !checkedItems.has(`${item.nom}-${item.rayon}`));
            
            if (relevantItems.length > 0) {
                text += `=== ${label.toUpperCase()} ===\n`;
                relevantItems.forEach(item => {
                    const qtyText = item.quantite + (item.unite !== 'pièce' && item.unite !== 'pièces' ? ' ' + item.unite : '');
                    text += `- ${item.nom} (${qtyText})\n`;
                });
                text += '\n';
            }
        }

        navigator.clipboard.writeText(text).then(() => {
            showToast("✅ Liste copiée (sans le cellier) !");
        });
    });

    btnUncheckAll.addEventListener('click', () => {
        checkedItems.clear();
        renderShoppingList();
        showToast("🧹 Toutes les cases ont été décochées !");
    });

    // Modal Aide Logic
    const btnHelp = document.getElementById('btn-help');
    const helpModal = document.getElementById('help-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnUnderstood = document.getElementById('btn-understood');

    if (btnHelp && helpModal) {
        btnHelp.addEventListener('click', () => {
            helpModal.classList.add('active');
        });

        const closeModal = () => helpModal.classList.remove('active');
        btnCloseModal.addEventListener('click', closeModal);
        btnUnderstood.addEventListener('click', closeModal);
        
        // Close when clicking outside content (on the overlay)
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) closeModal();
        });
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'dark';

    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        themeToggle.checked = true;
    } else {
        body.classList.add('dark-mode');
        themeToggle.checked = false;
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            showToast("☀️ Mode jour activé");
        } else {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            showToast("🌙 Mode nuit activé");
        }
    });

    // Back to Top Button Logic
    const btnBackToTop = document.getElementById('btn-back-to-top');
    if (btnBackToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btnBackToTop.classList.add('visible');
            } else {
                btnBackToTop.classList.remove('visible');
            }
        });

        btnBackToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    renderMenu();

    /**
     * Permet d'ajouter depuis une source externe une recette normalisée au menu.
     * L'objet attendu (recipe) doit contenir au minimum :
     * { title, image, time, calories, ingredients: [{name, quantity, unit}], source, url }
     */
    window.addExternalRecipe = (recipe) => {
        try {
            if (!currentMenu) renderMenu();

            // Normaliser les propriétés attendues par l'app
            const normalized = {
                id: 'ext-' + Date.now(),
                icone: '🍽️',
                nom: recipe.title || recipe.name || 'Recette externe',
                tempsPreparation: recipe.time || recipe.temps || 30,
                calories: recipe.calories || 0,
                ingredients: (recipe.ingredients || []).map(i => ({ quantite: i.quantity || i.quantite || '', unite: i.unit || i.unite || '', nom: i.name || i.nom || i.raw || '' })),
                preparation: recipe.preparation || recipe.steps || [],
                source: recipe.source || recipe.domain || recipe.url || 'externe',
                url: recipe.url || recipe.link || ''
            };

            // Insérer dans le premier jour au midi par défaut (non destructif)
            if (currentMenu && Array.isArray(currentMenu.jours) && currentMenu.jours.length > 0) {
                currentMenu.jours[0].midi = normalized;
                renderMenu(false);
                showToast('✅ Recette ajoutée au menu (Jour 1 — Midi)');
            } else {
                showToast('⚠️ Impossible d\'ajouter la recette pour le moment.');
            }
        } catch (err) {
            console.error('addExternalRecipe error', err);
            showToast('Erreur lors de l\'ajout de la recette.');
        }
    };
});
