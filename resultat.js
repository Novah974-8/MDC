"use strict";

const selectEquipe = document.getElementById("equipe");
const boutonActualiser = document.getElementById("actualiser");
const zoneResultats = document.getElementById("liste-resultats");
const zoneStatut = document.getElementById("statut-resultats");
let numeroDemande = 0;

function dateEnFrancais(valeur) {
  const date = new Date(`${valeur}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? valeur
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function afficherResultats(donnees, equipe) {
  zoneResultats.replaceChildren();
  const matchs = donnees?.matchs;

  if (!Array.isArray(matchs) || matchs.length === 0) {
    zoneStatut.textContent = donnees?.message || "Aucun match sauvegardé pour cette équipe.";
    return;
  }

  for (const match of matchs.slice(0, 5)) {
    const article = document.createElement("article");
    article.className = "match-resultat";

    const pastille = document.createElement("span");
    const verdict = ["V", "N", "D"].includes(match.resultat) ? match.resultat : "N";
    pastille.className = `pastille-resultat ${verdict}`;
    pastille.textContent = verdict;
    pastille.setAttribute("aria-label", { V: "Victoire", N: "Match nul", D: "Défaite" }[verdict]);

    const contenu = document.createElement("div");
    contenu.className = "match-contenu";
    const date = document.createElement("time");
    date.className = "match-date";
    date.dateTime = match.date;
    date.textContent = dateEnFrancais(match.date);

    const affiche = document.createElement("div");
    affiche.className = "match-affiche";
    affiche.textContent = `${match.domicile} ${match.butsDomicile} - ${match.butsExterieur} ${match.exterieur}`;

    contenu.append(date, affiche);
    // Le lien aide à vérifier chaque score. Il provient des données sauvegardées.
    if (typeof match.source === "string" && /^https?:\/\//.test(match.source)) {
      const source = document.createElement("a");
      source.className = "match-source";
      source.href = match.source;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Vérifier la source ↗";
      contenu.append(source);
    }

    article.append(pastille, contenu);
    zoneResultats.append(article);
  }

  const maj = donnees.maj ? ` · dernière sauvegarde : ${new Date(donnees.maj).toLocaleString("fr-FR")}` : "";
  zoneStatut.textContent = `${matchs.length} match(s) affiché(s)${maj}. ${donnees.message || ""}`;
}

async function lireJSONSauvegarde(equipe) {
  // Mode sans backend : fonctionne sur un hébergement web statique,
  // si resultats.json a été généré auparavant par server.js.
  const reponse = await fetch("./resultats.json", { cache: "no-store" });
  if (!reponse.ok) throw new Error("Fichier JSON inaccessible.");
  const sauvegarde = await reponse.json();
  const entree = sauvegarde.equipes?.[equipe] || { maj: null, matchs: [] };
  return {
    ...entree,
    message: "Données sauvegardées (mode sans API).",
  };
}

async function chargerResultats(actualisationForcee = false) {
  const equipe = selectEquipe.value;
  const demande = ++numeroDemande;
  zoneResultats.replaceChildren();
  boutonActualiser.disabled = !equipe;
  if (!equipe) {
    zoneStatut.textContent = "Choisis une équipe.";
    return;
  }

  boutonActualiser.disabled = true;
  zoneStatut.textContent = actualisationForcee ? "Recherche des derniers matchs en cours…" : "Chargement des résultats…";

  try {
    let donnees;
    try {
      const route = actualisationForcee ? "/api/actualiser" : "/api/resultats";
      const reponse = await fetch(`${route}?equipe=${encodeURIComponent(equipe)}`, {
        method: actualisationForcee ? "POST" : "GET",
        cache: "no-store"
      });
      if (!reponse.ok) throw new Error(`Erreur serveur (${reponse.status})`);
      donnees = await reponse.json();
    } catch (erreurAPI) {
      // Si le backend n'est pas lancé (ex. site statique), lire le JSON directement.
      donnees = await lireJSONSauvegarde(equipe);
    }
    if (demande === numeroDemande) afficherResultats(donnees, equipe);
  } catch (erreur) {
    if (demande === numeroDemande) {
      zoneStatut.textContent = "Impossible de charger les résultats. Lance le serveur ou vérifie resultats.json.";
    }
  } finally {
    if (demande === numeroDemande) boutonActualiser.disabled = false;
  }
}

selectEquipe.addEventListener("change", () => chargerResultats());
boutonActualiser.addEventListener("click", () => chargerResultats(true));
