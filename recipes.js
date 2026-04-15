// ============================================================
// recipes.js — 21 recettes françaises de saison (printemps)
// + générateur de menu équilibré sur 7 jours
// + calculateur de liste de courses avec fusion des ingrédients
// ============================================================

// -----------------------------------------------------------
// DONNÉES : 21 recettes (7 midi, 7 soir, 7 alternatives)
// -----------------------------------------------------------

const recettesMidi = [
  {
    id: "midi-1",
    nom: "Poulet rôti aux asperges vertes",
    categorie: "viande",
    tempsPreparation: 45,
    calories: 520,
    icone: "🍗",
    ingredients: [
      { nom: "blanc de poulet", quantite: 400, unite: "g" },
      { nom: "asperges vertes", quantite: 300, unite: "g" },
      { nom: "pommes de terre", quantite: 400, unite: "g" },
      { nom: "huile d'olive", quantite: 2, unite: "c. à soupe" },
      { nom: "ail", quantite: 2, unite: "gousses" },
      { nom: "thym frais", quantite: 3, unite: "brins" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "midi-2",
    nom: "Filet de cabillaud, beurre citronné et petits pois",
    categorie: "poisson",
    tempsPreparation: 25,
    calories: 380,
    icone: "🐟",
    ingredients: [
      { nom: "filet de cabillaud", quantite: 400, unite: "g" },
      { nom: "petits pois frais", quantite: 250, unite: "g" },
      { nom: "beurre", quantite: 30, unite: "g" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "échalote", quantite: 1, unite: "pièce" },
      { nom: "persil plat", quantite: 4, unite: "brins" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "midi-3",
    nom: "Risotto primavera aux légumes de printemps",
    categorie: "végétarien",
    tempsPreparation: 35,
    calories: 420,
    icone: "🌿",
    ingredients: [
      { nom: "riz arborio", quantite: 300, unite: "g" },
      { nom: "asperges vertes", quantite: 150, unite: "g" },
      { nom: "petits pois frais", quantite: 100, unite: "g" },
      { nom: "fèves fraîches", quantite: 100, unite: "g" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "parmesan", quantite: 60, unite: "g" },
      { nom: "vin blanc sec", quantite: 10, unite: "cl" },
      { nom: "bouillon de légumes", quantite: 75, unite: "cl" },
      { nom: "beurre", quantite: 20, unite: "g" },
      { nom: "huile d'olive", quantite: 1, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "midi-4",
    nom: "Blanquette de veau printanière",
    categorie: "viande",
    tempsPreparation: 90,
    calories: 580,
    icone: "🥩",
    ingredients: [
      { nom: "épaule de veau", quantite: 500, unite: "g" },
      { nom: "carottes", quantite: 3, unite: "pièces" },
      { nom: "navets nouveaux", quantite: 3, unite: "pièces" },
      { nom: "champignons de Paris", quantite: 200, unite: "g" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "crème fraîche", quantite: 20, unite: "cl" },
      { nom: "jaune d'œuf", quantite: 2, unite: "pièces" },
      { nom: "bouquet garni", quantite: 1, unite: "pièce" },
      { nom: "farine", quantite: 30, unite: "g" },
      { nom: "beurre", quantite: 30, unite: "g" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "midi-5",
    nom: "Pavé de saumon grillé, sauce vierge",
    categorie: "poisson",
    tempsPreparation: 20,
    calories: 450,
    icone: "🐟",
    ingredients: [
      { nom: "pavé de saumon", quantite: 400, unite: "g" },
      { nom: "tomates", quantite: 3, unite: "pièces" },
      { nom: "basilic frais", quantite: 10, unite: "feuilles" },
      { nom: "huile d'olive", quantite: 3, unite: "c. à soupe" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "échalote", quantite: 1, unite: "pièce" },
      { nom: "riz basmati", quantite: 250, unite: "g" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "midi-6",
    nom: "Quiche aux épinards et chèvre frais",
    categorie: "végétarien",
    tempsPreparation: 40,
    calories: 460,
    icone: "🥧",
    ingredients: [
      { nom: "pâte brisée", quantite: 1, unite: "pièce" },
      { nom: "épinards frais", quantite: 300, unite: "g" },
      { nom: "chèvre frais", quantite: 150, unite: "g" },
      { nom: "œufs", quantite: 3, unite: "pièces" },
      { nom: "crème fraîche", quantite: 20, unite: "cl" },
      { nom: "lait", quantite: 10, unite: "cl" },
      { nom: "noix de muscade", quantite: 1, unite: "pincée" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "midi-7",
    nom: "Émincé de dinde aux morilles",
    categorie: "viande",
    tempsPreparation: 30,
    calories: 490,
    icone: "🍗",
    ingredients: [
      { nom: "escalopes de dinde", quantite: 400, unite: "g" },
      { nom: "morilles séchées", quantite: 30, unite: "g" },
      { nom: "crème fraîche", quantite: 25, unite: "cl" },
      { nom: "échalote", quantite: 2, unite: "pièces" },
      { nom: "beurre", quantite: 20, unite: "g" },
      { nom: "vin blanc sec", quantite: 10, unite: "cl" },
      { nom: "tagliatelles fraîches", quantite: 300, unite: "g" },
      { nom: "persil plat", quantite: 4, unite: "brins" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  }
];

const recettesSoir = [
  {
    id: "soir-1",
    nom: "Velouté de petits pois à la menthe",
    categorie: "végétarien",
    tempsPreparation: 25,
    calories: 220,
    icone: "🥣",
    ingredients: [
      { nom: "petits pois frais", quantite: 400, unite: "g" },
      { nom: "pommes de terre", quantite: 200, unite: "g" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "menthe fraîche", quantite: 8, unite: "feuilles" },
      { nom: "crème fraîche", quantite: 10, unite: "cl" },
      { nom: "bouillon de légumes", quantite: 50, unite: "cl" },
      { nom: "beurre", quantite: 15, unite: "g" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "soir-2",
    nom: "Salade tiède de lentilles au saumon fumé",
    categorie: "poisson",
    tempsPreparation: 30,
    calories: 390,
    icone: "🥗",
    ingredients: [
      { nom: "lentilles vertes du Puy", quantite: 200, unite: "g" },
      { nom: "saumon fumé", quantite: 200, unite: "g" },
      { nom: "échalote", quantite: 2, unite: "pièces" },
      { nom: "carottes", quantite: 2, unite: "pièces" },
      { nom: "vinaigre de vin", quantite: 2, unite: "c. à soupe" },
      { nom: "huile d'olive", quantite: 3, unite: "c. à soupe" },
      { nom: "moutarde de Dijon", quantite: 1, unite: "c. à café" },
      { nom: "ciboulette", quantite: 6, unite: "brins" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "soir-3",
    nom: "Croque-monsieur au jambon et gruyère",
    categorie: "viande",
    tempsPreparation: 15,
    calories: 430,
    icone: "🥪",
    ingredients: [
      { nom: "pain de mie", quantite: 4, unite: "tranches" },
      { nom: "jambon blanc", quantite: 4, unite: "tranches" },
      { nom: "gruyère râpé", quantite: 100, unite: "g" },
      { nom: "beurre", quantite: 20, unite: "g" },
      { nom: "béchamel", quantite: 15, unite: "cl" },
      { nom: "noix de muscade", quantite: 1, unite: "pincée" },
      { nom: "salade verte", quantite: 100, unite: "g" }
    ]
  },
  {
    id: "soir-4",
    nom: "Tartare de daurade aux agrumes",
    categorie: "poisson",
    tempsPreparation: 20,
    calories: 280,
    icone: "🐟",
    ingredients: [
      { nom: "filet de daurade", quantite: 400, unite: "g" },
      { nom: "citron vert", quantite: 2, unite: "pièces" },
      { nom: "orange", quantite: 1, unite: "pièce" },
      { nom: "avocat", quantite: 1, unite: "pièce" },
      { nom: "coriandre fraîche", quantite: 6, unite: "brins" },
      { nom: "huile d'olive", quantite: 2, unite: "c. à soupe" },
      { nom: "piment d'Espelette", quantite: 1, unite: "pincée" },
      { nom: "sel", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "soir-5",
    nom: "Omelette aux fines herbes et salade",
    categorie: "végétarien",
    tempsPreparation: 15,
    calories: 320,
    icone: "🥚",
    ingredients: [
      { nom: "œufs", quantite: 6, unite: "pièces" },
      { nom: "ciboulette", quantite: 6, unite: "brins" },
      { nom: "persil plat", quantite: 4, unite: "brins" },
      { nom: "estragon", quantite: 3, unite: "brins" },
      { nom: "beurre", quantite: 20, unite: "g" },
      { nom: "salade verte", quantite: 100, unite: "g" },
      { nom: "vinaigrette", quantite: 3, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "soir-6",
    nom: "Gratin d'artichauts au poulet",
    categorie: "viande",
    tempsPreparation: 40,
    calories: 410,
    icone: "🍗",
    ingredients: [
      { nom: "fonds d'artichauts", quantite: 6, unite: "pièces" },
      { nom: "blanc de poulet", quantite: 250, unite: "g" },
      { nom: "crème fraîche", quantite: 20, unite: "cl" },
      { nom: "gruyère râpé", quantite: 80, unite: "g" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "ail", quantite: 1, unite: "gousse" },
      { nom: "huile d'olive", quantite: 1, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "soir-7",
    nom: "Soupe de radis et pomme de terre",
    categorie: "végétarien",
    tempsPreparation: 30,
    calories: 210,
    icone: "🥣",
    ingredients: [
      { nom: "radis roses", quantite: 2, unite: "bottes" },
      { nom: "pommes de terre", quantite: 300, unite: "g" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "bouillon de légumes", quantite: 60, unite: "cl" },
      { nom: "crème fraîche", quantite: 10, unite: "cl" },
      { nom: "beurre", quantite: 15, unite: "g" },
      { nom: "ciboulette", quantite: 4, unite: "brins" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  }
];

const recettesAlternatives = [
  {
    id: "alt-1",
    nom: "Tajine d'agneau aux fèves et citron confit",
    categorie: "viande",
    tempsPreparation: 60,
    calories: 550,
    icone: "🍖",
    ingredients: [
      { nom: "épaule d'agneau", quantite: 500, unite: "g" },
      { nom: "fèves fraîches", quantite: 300, unite: "g" },
      { nom: "citron confit", quantite: 1, unite: "pièce" },
      { nom: "oignon", quantite: 2, unite: "pièces" },
      { nom: "ail", quantite: 3, unite: "gousses" },
      { nom: "cumin", quantite: 1, unite: "c. à café" },
      { nom: "coriandre fraîche", quantite: 6, unite: "brins" },
      { nom: "huile d'olive", quantite: 2, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "alt-2",
    nom: "Papillote de truite aux herbes du jardin",
    categorie: "poisson",
    tempsPreparation: 25,
    calories: 340,
    icone: "🐟",
    ingredients: [
      { nom: "filet de truite", quantite: 400, unite: "g" },
      { nom: "courgettes", quantite: 2, unite: "pièces" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "aneth", quantite: 4, unite: "brins" },
      { nom: "thym frais", quantite: 3, unite: "brins" },
      { nom: "huile d'olive", quantite: 2, unite: "c. à soupe" },
      { nom: "vin blanc sec", quantite: 5, unite: "cl" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "alt-3",
    nom: "Tarte fine aux tomates cerises et mozzarella",
    categorie: "végétarien",
    tempsPreparation: 30,
    calories: 400,
    icone: "🍕",
    ingredients: [
      { nom: "pâte feuilletée", quantite: 1, unite: "pièce" },
      { nom: "tomates cerises", quantite: 300, unite: "g" },
      { nom: "mozzarella", quantite: 200, unite: "g" },
      { nom: "moutarde de Dijon", quantite: 1, unite: "c. à soupe" },
      { nom: "basilic frais", quantite: 8, unite: "feuilles" },
      { nom: "huile d'olive", quantite: 1, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "alt-4",
    nom: "Curry de crevettes au lait de coco",
    categorie: "poisson",
    tempsPreparation: 25,
    calories: 420,
    icone: "🦐",
    ingredients: [
      { nom: "crevettes décortiquées", quantite: 400, unite: "g" },
      { nom: "lait de coco", quantite: 40, unite: "cl" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "ail", quantite: 2, unite: "gousses" },
      { nom: "gingembre frais", quantite: 1, unite: "morceau" },
      { nom: "pâte de curry rouge", quantite: 2, unite: "c. à soupe" },
      { nom: "riz basmati", quantite: 250, unite: "g" },
      { nom: "coriandre fraîche", quantite: 4, unite: "brins" },
      { nom: "citron vert", quantite: 1, unite: "pièce" },
      { nom: "sel", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "alt-5",
    nom: "Gratin de penne aux épinards et ricotta",
    categorie: "végétarien",
    tempsPreparation: 35,
    calories: 470,
    icone: "🍝",
    ingredients: [
      { nom: "penne", quantite: 300, unite: "g" },
      { nom: "épinards frais", quantite: 250, unite: "g" },
      { nom: "ricotta", quantite: 200, unite: "g" },
      { nom: "parmesan", quantite: 50, unite: "g" },
      { nom: "ail", quantite: 2, unite: "gousses" },
      { nom: "crème fraîche", quantite: 15, unite: "cl" },
      { nom: "noix de muscade", quantite: 1, unite: "pincée" },
      { nom: "huile d'olive", quantite: 1, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "alt-6",
    nom: "Rôti de porc au miel et carottes nouvelles",
    categorie: "viande",
    tempsPreparation: 55,
    calories: 530,
    icone: "🥩",
    ingredients: [
      { nom: "rôti de porc", quantite: 600, unite: "g" },
      { nom: "carottes nouvelles", quantite: 6, unite: "pièces" },
      { nom: "miel", quantite: 2, unite: "c. à soupe" },
      { nom: "moutarde à l'ancienne", quantite: 2, unite: "c. à soupe" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "ail", quantite: 2, unite: "gousses" },
      { nom: "thym frais", quantite: 3, unite: "brins" },
      { nom: "huile d'olive", quantite: 1, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" },
      { nom: "poivre", quantite: 1, unite: "pincée" }
    ]
  },
  {
    id: "alt-7",
    nom: "Buddha bowl printanier aux pois chiches",
    categorie: "végétarien",
    tempsPreparation: 25,
    calories: 410,
    icone: "🥗",
    ingredients: [
      { nom: "pois chiches en conserve", quantite: 250, unite: "g" },
      { nom: "quinoa", quantite: 150, unite: "g" },
      { nom: "avocat", quantite: 1, unite: "pièce" },
      { nom: "radis roses", quantite: 1, unite: "botte" },
      { nom: "concombre", quantite: 1, unite: "pièce" },
      { nom: "carottes", quantite: 2, unite: "pièces" },
      { nom: "graines de sésame", quantite: 1, unite: "c. à soupe" },
      { nom: "huile d'olive", quantite: 2, unite: "c. à soupe" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "tahini", quantite: 2, unite: "c. à soupe" },
      { nom: "sel", quantite: 1, unite: "pincée" }
    ]
  }
];

// -----------------------------------------------------------
// Toutes les recettes regroupées
// -----------------------------------------------------------
const toutesLesRecettes = [
  ...recettesMidi,
  ...recettesSoir,
  ...recettesAlternatives
];

// -----------------------------------------------------------
// FONCTION 1 : Générer un menu équilibré sur 7 jours
// -----------------------------------------------------------
// Règles :
//   - 1 recette midi + 1 recette soir par jour
//   - Pas deux fois la même catégorie de protéine d'affilée
//     (le soir compte comme « avant » le midi du lendemain)
//   - Alterner viande / poisson / végétarien autant que possible
//   - Aucune recette ne se répète dans la semaine

/**
 * Génère un menu hebdomadaire équilibré.
 * @returns {{ jours: Array<{ jour: string, midi: object, soir: object }> }}
 */
function genererMenuSemaine() {
  const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const categories = ["viande", "poisson", "végétarien"];

  // Copier les tableaux pour pouvoir piocher sans altérer les originaux
  const poolMidi = [...recettesMidi];
  const poolSoir = [...recettesSoir];
  const poolAlt = [...recettesAlternatives];

  // Index par catégorie
  const parCategorie = (pool, cat) => pool.filter(r => r.categorie === cat);

  // Mélanger un tableau (Fisher-Yates)
  const melanger = (arr) => {
    const copie = [...arr];
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  };

  const menu = [];
  const recettesUtilisees = new Set();
  let dernièreCategorie = null; // la catégorie du dernier repas attribué

  /**
   * Choisir une recette qui respecte les contraintes :
   *   - pas déjà utilisée
   *   - catégorie différente de la dernière
   *   - privilégie l'alternance viande/poisson/végétarien
   */
  function choisirRecette(pool, catPrecedente) {
    // Déterminer les catégories acceptables (toutes sauf la précédente)
    const catsAcceptables = categories.filter(c => c !== catPrecedente);

    // 1) Chercher dans le pool principal, catégorie acceptable
    for (const cat of melanger(catsAcceptables)) {
      const candidates = pool.filter(
        r => r.categorie === cat && !recettesUtilisees.has(r.id)
      );
      if (candidates.length > 0) {
        const choix = candidates[Math.floor(Math.random() * candidates.length)];
        return choix;
      }
    }

    // 2) Si pas trouvé, chercher dans les alternatives
    for (const cat of melanger(catsAcceptables)) {
      const candidates = poolAlt.filter(
        r => r.categorie === cat && !recettesUtilisees.has(r.id)
      );
      if (candidates.length > 0) {
        const choix = candidates[Math.floor(Math.random() * candidates.length)];
        return choix;
      }
    }

    // 3) En dernier recours, prendre n'importe quelle recette non utilisée
    const restantes = [...pool, ...poolAlt].filter(
      r => !recettesUtilisees.has(r.id)
    );
    if (restantes.length > 0) {
      return restantes[Math.floor(Math.random() * restantes.length)];
    }

    return null;
  }

  for (const jour of jours) {
    // Choisir le MIDI
    const midi = choisirRecette(poolMidi, dernièreCategorie);
    if (midi) {
      recettesUtilisees.add(midi.id);
      dernièreCategorie = midi.categorie;
    }

    // Choisir le SOIR (différent du midi du même jour)
    const soir = choisirRecette(poolSoir, dernièreCategorie);
    if (soir) {
      recettesUtilisees.add(soir.id);
      dernièreCategorie = soir.categorie;
    }

    menu.push({ jour, midi, soir });
  }

  return { jours: menu };
}

/**
 * Choisit une recette alternative pour remplacer un repas existant.
 * @param {Set<string>} recettesUtilisees - IDs des recettes déjà dans le menu
 * @param {string} categorie - 'viande', 'poisson', ou 'végétarien'
 * @param {string} type - 'midi' ou 'soir'
 * @returns {object|null}
 */
function piocherRecetteAlternative(recettesUtilisees, categorie, type) {
  const pool = type === 'midi' ? [...recettesMidi] : [...recettesSoir];
  const possible = [...pool, ...recettesAlternatives].filter(
    r => r.categorie === categorie && !recettesUtilisees.has(r.id)
  );

  if (possible.length > 0) {
    return possible[Math.floor(Math.random() * possible.length)];
  }

  // Fallback : n'importe quelle catégorie si celle demandée est vide (rare)
  const fallback = [...pool, ...recettesAlternatives].filter(
    r => !recettesUtilisees.has(r.id)
  );
  return fallback.length > 0 ? fallback[0] : null;
}


// -----------------------------------------------------------
// FONCTION 2 : Calculer la liste de courses (fusion)
// -----------------------------------------------------------
// Fusionne les ingrédients identiques (même nom + même unité)
// en additionnant les quantités.

/**
 * Calcule la liste de courses à partir d'un menu généré.
 * @param {{ jours: Array<{ midi: object, soir: object }> }} menu
 * @returns {Array<{ nom: string, quantite: number, unite: string, rayon: string }>}
 */
function calculerListeDeCourses(menu) {
  const index = {}; // clé = "nom||unite" → { nom, quantite, unite }

  // Parcourir toutes les recettes du menu
  for (const jour of menu.jours) {
    const repas = [jour.midi, jour.soir].filter(Boolean);
    for (const recette of repas) {
      for (const ing of recette.ingredients) {
        const cle = `${ing.nom.toLowerCase()}||${ing.unite.toLowerCase()}`;
        if (index[cle]) {
          index[cle].quantite += ing.quantite;
        } else {
      index[cle] = {
        nom: ing.nom,
        quantite: ing.quantite,
        unite: ing.unite,
        rayon: detecterRayon(ing.nom),
        estCellier: estDansLeCellier(ing.nom)
      };
    }
  }
}
  }

  // Convertir en tableau trié par rayon puis par nom
  return Object.values(index).sort((a, b) => {
    if (a.rayon !== b.rayon) return a.rayon.localeCompare(b.rayon);
    return a.nom.localeCompare(b.nom);
  });
}


// -----------------------------------------------------------
// UTILITAIRE : Détection automatique du rayon
// -----------------------------------------------------------

const RAYONS = {
  "fruits-legumes": [
    "asperges", "petits pois", "fèves", "épinards", "radis",
    "carottes", "navets", "tomates", "courgettes", "concombre",
    "avocat", "oignon", "échalote", "ail", "pommes de terre",
    "champignons", "artichaut", "fonds d'artichaut", "citron",
    "citron vert", "orange", "salade verte", "radis roses"
  ],
  "proteines": [
    "poulet", "blanc de poulet", "veau", "épaule de veau", "agneau",
    "épaule d'agneau", "dinde", "escalopes de dinde", "porc", "rôti de porc",
    "jambon", "jambon blanc", "cabillaud", "filet de cabillaud",
    "saumon", "pavé de saumon", "saumon fumé", "daurade", "filet de daurade",
    "truite", "filet de truite", "crevettes", "crevettes décortiquées",
    "œufs", "jaune d'œuf"
  ],
  "epicerie": [
    "riz", "riz arborio", "riz basmati", "penne", "tagliatelles",
    "quinoa", "lentilles", "lentilles vertes du Puy", "farine",
    "huile d'olive", "vinaigre", "vinaigre de vin", "moutarde",
    "moutarde de Dijon", "moutarde à l'ancienne", "miel",
    "pâte de curry", "pâte de curry rouge", "cumin",
    "piment d'Espelette", "noix de muscade", "sel", "poivre",
    "bouquet garni", "pois chiches", "pois chiches en conserve",
    "graines de sésame", "tahini", "bouillon de légumes",
    "vinaigrette", "pain de mie", "béchamel",
    "pâte brisée", "pâte feuilletée", "citron confit",
    "lait de coco", "vin blanc sec"
  ],
  "cremerie": [
    "beurre", "crème fraîche", "lait", "gruyère", "gruyère râpé",
    "parmesan", "chèvre", "chèvre frais", "mozzarella", "ricotta"
  ],
  "herbes-fraiches": [
    "thym", "thym frais", "persil", "persil plat", "basilic",
    "basilic frais", "menthe", "menthe fraîche", "ciboulette",
    "coriandre", "coriandre fraîche", "aneth", "estragon",
    "gingembre", "gingembre frais"
  ]
};

// Produits que l'on possède généralement déjà (cellier)
const PRODUITS_CELLIER = [
  "sel", "poivre", "huile d'olive", "vinaigre", "moutarde", 
  "ail", "oignon", "échalote", "sucre", "farine", "beurre",
  "noix de muscade", "piment d'espelette", "cumin", "bouillon de légumes",
  "laurier", "thym", "basilic", "persil"
];

/**
 * Détecte le rayon d'un ingrédient par son nom.
 * @param {string} nomIngredient
 * @returns {string} Le nom du rayon
 */
function detecterRayon(nomIngredient) {
  const nom = nomIngredient.toLowerCase();

  for (const [rayon, motsClefs] of Object.entries(RAYONS)) {
    // Correspondance exacte
    if (motsClefs.includes(nom)) {
      return rayon;
    }
    // Correspondance partielle
    for (const mot of motsClefs) {
      if (nom.includes(mot) || mot.includes(nom)) {
        return rayon;
      }
    }
  }

  return "autres";
}

/**
 * Vérifie si un ingrédient est un produit de base du cellier.
 * @param {string} nomIngredient 
 * @returns {boolean}
 */
function estDansLeCellier(nomIngredient) {
  const nom = nomIngredient.toLowerCase();
  return PRODUITS_CELLIER.some(p => nom.includes(p));
}


// -----------------------------------------------------------
// LABELS RAYONS (pour l'affichage)
// -----------------------------------------------------------
const LABELS_RAYONS = {
  "fruits-legumes": "🥬 Fruits & Légumes",
  "proteines": "🥩 Protéines",
  "epicerie": "🏪 Épicerie",
  "cremerie": "🧀 Crèmerie",
  "herbes-fraiches": "🌿 Herbes fraîches",
  "autres": "📦 Autres"
};
