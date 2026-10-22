"use strict";

// Serveur Node.js 18+ : aucune bibliothèque externe nécessaire.
// La clé ne va JAMAIS dans resultat.html ou resultat.js : ils sont visibles par tous.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const CLE_OPENAI = process.env.OPENAI_API_KEY || "CLE_API_A_ENTRER";
const MODELE = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const PORT = Number(process.env.PORT || 3000);
const HOTE = process.env.HOST || "127.0.0.1"; // local par défaut, pas exposé sur Internet
const DUREE_CACHE = 12 * 60 * 60 * 1000; // 12 heures
const DELAI_REESSAI = 5 * 60 * 1000;    // évite les requêtes payantes répétées
const FICHIER_JSON = path.join(__dirname, "resultats.json");

const EQUIPES = {
  atletico: { nom: "Atlético de Madrid", identifiant: "atletico" },
  bayern: { nom: "Bayern Munich", identifiant: "bayern" },
  real: { nom: "Real Madrid", identifiant: "real madrid" },
  psg: { nom: "Paris Saint-Germain", identifiant: "paris saint-germain" },
  barca: { nom: "FC Barcelone", identifiant: "barcelon" },
  liverpool: { nom: "Liverpool", identifiant: "liverpool" },
  city: { nom: "Manchester City", identifiant: "manchester city" },
  inter: { nom: "Inter Milan", identifiant: "inter" }
};

const dernierEssai = new Map();
const misesAJourEnCours = new Map();
const clePresente = CLE_OPENAI && CLE_OPENAI !== "COLLE_TA_CLE_ICI";

function lireSauvegarde() {
  try {
    const donnees = JSON.parse(fs.readFileSync(FICHIER_JSON, "utf8"));
    if (donnees && typeof donnees.equipes === "object" && !Array.isArray(donnees.equipes)) return donnees;
  } catch (_) { /* création au besoin */ }
  return { equipes: {} };
}

function entreeSauvegardee(equipe) {
  return lireSauvegarde().equipes[equipe] || { maj: null, matchs: [] };
}

function repondreJSON(reponse, status, objet) {
  reponse.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  reponse.end(JSON.stringify(objet));
}

function simplifier(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resultatPourEquipe(match, equipe) {
  const identifiant = EQUIPES[equipe].identifiant;
  const domicile = simplifier(match.domicile);
  const exterieur = simplifier(match.exterieur);
  const estDomicile = domicile.includes(identifiant) || (equipe === "psg" && domicile.includes("psg"));
  const estExterieur = exterieur.includes(identifiant) || (equipe === "psg" && exterieur.includes("psg"));
  if (estDomicile === estExterieur) return null; // match sans équipe choisie ou ambigu
  const butsEquipe = estDomicile ? match.butsDomicile : match.butsExterieur;
  const butsAutre = estDomicile ? match.butsExterieur : match.butsDomicile;
  return butsEquipe > butsAutre ? "V" : butsEquipe === butsAutre ? "N" : "D";
}

function validerMatch(match, equipe) {
  if (!match || typeof match !== "object") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date) || Number.isNaN(Date.parse(match.date))) return null;
  if (new Date(`${match.date}T23:59:59Z`).getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  if (!["domicile", "exterieur", "source"].every(champ => typeof match[champ] === "string" && match[champ].length < 300)) return null;
  if (!["butsDomicile", "butsExterieur"].every(champ => Number.isInteger(match[champ]) && match[champ] >= 0 && match[champ] <= 30)) return null;
  try {
    const url = new URL(match.source);
    if (!["http:", "https:"].includes(url.protocol)) return null;
  } catch (_) { return null; }
  const resultat = resultatPourEquipe(match, equipe);
  return resultat ? {
    date: match.date,
    domicile: match.domicile.trim(),
    exterieur: match.exterieur.trim(),
    butsDomicile: match.butsDomicile,
    butsExterieur: match.butsExterieur,
    resultat,
    source: match.source
  } : null;
}

async function rechercherSurOpenAI(equipe) {
  const nom = EQUIPES[equipe].nom;
  const schemaMatch = {
    type: "object",
    additionalProperties: false,
    properties: {
      date: { type: "string" },
      domicile: { type: "string" },
      exterieur: { type: "string" },
      butsDomicile: { type: "integer" },
      butsExterieur: { type: "integer" },
      source: { type: "string" }
    },
    required: ["date", "domicile", "exterieur", "butsDomicile", "butsExterieur", "source"]
  };

  const requete = {
    model: MODELE,
    store: false,
    tools: [{ type: "web_search", search_context_size: "medium" }],
    tool_choice: "required",
    text: {
      format: {
        type: "json_schema",
        name: "cinq_matchs_ldc",
        strict: true,
        schema: {
          type: "object", additionalProperties: false,
          properties: { matchs: { type: "array", items: schemaMatch } },
          required: ["matchs"]
        }
      }
    },
    instructions: `Tu extrais des scores de football vérifiables, sans inventer. Recherche sur le web. Retourne UNIQUEMENT les CINQ derniers matchs TERMINÉS de ${nom} en Ligue des champions MASCULINE UEFA (toutes saisons, pas uniquement la saison en cours), triés du plus récent au plus ancien. N'inclus jamais les autres compétitions ou matchs à venir. Pour les scores, utilise le score final officiel hors séance de tirs au but. Dates YYYY-MM-DD. Chaque source doit être une URL web pertinente que tu as trouvée via la recherche. Si tu ne peux pas vérifier 5 matchs, donne seulement ceux que tu peux vérifier.` ,
    input: `Aujourd'hui : ${new Date().toISOString().slice(0, 10)}. Recherche les 5 derniers résultats de Ligue des champions de ${nom}, avec dates, clubs, scores et URLs de sources fiables.`
  };

  const reponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CLE_OPENAI}`
    },
    body: JSON.stringify(requete),
    signal: AbortSignal.timeout(60000)
  });

  if (!reponse.ok) {
    const err = await reponse.json().catch(() => ({}));
    throw new Error(`OpenAI HTTP ${reponse.status}: ${err.error?.message || "requête refusée"}`);
  }

  const contenu = await reponse.json();
  if (contenu.status !== "completed") throw new Error("Réponse OpenAI incomplète.");
  const texte = (contenu.output || [])
    .filter(item => item.type === "message")
    .flatMap(item => item.content || [])
    .filter(partie => partie.type === "output_text")
    .map(partie => partie.text)
    .join("");
  const donnees = JSON.parse(texte);
  if (!Array.isArray(donnees.matchs)) throw new Error("Format des matchs incorrect.");

  const valides = donnees.matchs.map(match => validerMatch(match, equipe)).filter(Boolean);
  const uniques = [...new Map(valides.map(m => [`${m.date}|${simplifier(m.domicile)}|${simplifier(m.exterieur)}`, m])).values()];
  uniques.sort((a, b) => b.date.localeCompare(a.date));
  if (uniques.length < 5) throw new Error("Moins de cinq matchs valides trouvés : ancien cache conservé.");
  return uniques.slice(0, 5);
}

async function actualiserEquipe(equipe) {
  if (misesAJourEnCours.has(equipe)) return misesAJourEnCours.get(equipe);
  const travail = (async () => {
    dernierEssai.set(equipe, Date.now());
    const matchs = await rechercherSurOpenAI(equipe);
    const sauvegarde = lireSauvegarde();
    sauvegarde.equipes[equipe] = { maj: new Date().toISOString(), matchs };
    // Enregistrement persistant : les données restent après la suppression de la clé.
    const temporaire = FICHIER_JSON + ".tmp";
    fs.writeFileSync(temporaire, JSON.stringify(sauvegarde, null, 2) + "\n", "utf8");
    fs.renameSync(temporaire, FICHIER_JSON);
    return sauvegarde.equipes[equipe];
  })();
  misesAJourEnCours.set(equipe, travail);
  try { return await travail; }
  finally { misesAJourEnCours.delete(equipe); }
}

async function routeAPI(requete, reponse, url) {
  const equipe = url.searchParams.get("equipe");
  if (!Object.hasOwn(EQUIPES, equipe || "")) return repondreJSON(reponse, 400, { erreur: "Équipe invalide." });

  const cache = entreeSauvegardee(equipe);
  const dateCache = Date.parse(cache.maj || "");
  const estRecent = Array.isArray(cache.matchs) && cache.matchs.length === 5 &&
    Number.isFinite(dateCache) && Date.now() - dateCache < DUREE_CACHE;
  const force = url.pathname === "/api/actualiser";
  const tentativeRecente = Date.now() - (dernierEssai.get(equipe) || 0) < DELAI_REESSAI;

  if (!clePresente || (!force && estRecent) || tentativeRecente) {
    const explication = !clePresente
      ? "Données sauvegardées. Clé API absente : pas d'actualisation."
      : tentativeRecente && (force || !estRecent)
        ? "Données sauvegardées. Nouvelle recherche temporairement limitée (5 min)."
        : "Données sauvegardées (cache 12 h).";
    return repondreJSON(reponse, 200, { ...cache, equipe, message: explication });
  }

  try {
    const nouvelEtat = await actualiserEquipe(equipe);
    return repondreJSON(reponse, 200, { ...nouvelEtat, equipe, message: "Résultats recherchés et enregistrés dans resultats.json. Vérifie les sources." });
  } catch (erreur) {
    console.error(`[${equipe}]`, erreur.message);
    return repondreJSON(reponse, 200, {
      ...cache, equipe,
      message: "Recherche indisponible ou données non fiables : anciennes données conservées."
    });
  }
}

const FICHIERS_PUBLICS = new Set([
  "index.html", "connexion.html", "conversation.html", "inscription.html",
  "resultat.html", "style.css", "script.js", "resultat.js", "resultats.json"
]);
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };

const serveur = http.createServer(async (requete, reponse) => {
  try {
    const url = new URL(requete.url, `http://${requete.headers.host || "localhost"}`);
    if (url.pathname === "/api/resultats" && requete.method === "GET") return await routeAPI(requete, reponse, url);
    if (url.pathname === "/api/actualiser" && requete.method === "POST") return await routeAPI(requete, reponse, url);
    if (requete.method !== "GET") return repondreJSON(reponse, 405, { erreur: "Méthode non autorisée." });

    const relatif = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^\/+/, "");
    const autorise = FICHIERS_PUBLICS.has(relatif) || /^img\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|svg|webp)$/.test(relatif);
    const chemin = path.resolve(__dirname, relatif);
    if (!autorise || !chemin.startsWith(__dirname + path.sep)) {
      return repondreJSON(reponse, 404, { erreur: "Page introuvable." });
    }
    const extension = path.extname(chemin).toLowerCase();
    fs.readFile(chemin, (erreur, fichier) => {
      if (erreur) return repondreJSON(reponse, 404, { erreur: "Fichier introuvable." });
      reponse.writeHead(200, {
        "Content-Type": `${TYPES[extension] || "application/octet-stream"}${[".html", ".css", ".js", ".json"].includes(extension) ? "; charset=utf-8" : ""}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      reponse.end(fichier);
    });
  } catch (erreur) {
    console.error(erreur);
    if (!reponse.headersSent) repondreJSON(reponse, 500, { erreur: "Erreur du serveur." });
  }
});

serveur.listen(PORT, HOTE, () => {
  console.log(`Messagerie des Champions : http://${HOTE}:${PORT}/resultat.html`);
  console.log(clePresente ? "Clé API détectée : actualisation possible." : "Sans clé API : lecture de resultats.json uniquement.");
});
