# Messagerie des Champions — résultats LDC

Cette version conserve les pages HTML et le CSS du projet original et ajoute les **5 derniers résultats de Ligue des champions** par équipe, avec des ronds V / N / D et des liens vers les sources.

## Installation et démarrage

1. Installer **Node.js 18 ou plus récent**.
2. Copier votre répertoire `img/` du projet d’origine dans ce dossier (les images n’étaient pas dans les fichiers transmis).
3. Facultatif : ouvrir `server.js` et remplacer `COLLE_TA_CLE_ICI` par une **clé API OpenAI**. C’est une démonstration locale : ne jamais publier ce fichier avec une vraie clé. Plus sûr : utiliser la variable d’environnement `OPENAI_API_KEY`.
4. Dans ce dossier, lancer `npm start` (ou `node server.js`). Aucun `npm install` n’est requis.
5. Ouvrir **http://127.0.0.1:3000/resultat.html** dans le navigateur (pas le fichier directement par double-clic).
6. Choisir une équipe. Au premier chargement sans cache, le serveur utilise **OpenAI Responses API + `web_search`** si la clé est présente. Les matchs sont enregistrés dans `resultats.json`. Le bouton « Actualiser » permet de relancer la recherche ; une limite de 5 minutes entre tentatives réduit les coûts.
7. Une fois le JSON rempli, supprimer la clé. Relancer : les anciennes données continueront de s’afficher, mais elles ne se mettront plus à jour.

**Important :** le fichier `resultats.json` commence volontairement vide : nous n’avons pas inventé de scores. Une recherche valide avec une clé le remplira. Vous pouvez aussi y saisir manuellement des matchs confirmés, dans la même structure.

## Sans serveur Node.js, après avoir rempli le JSON

Sur un hébergement **statique HTTP(S)**, `resultat.html` et `resultat.js` essaieront l’API du serveur puis utiliseront `resultats.json` si elle est indisponible. Le fichier doit être accessible à côté de la page HTML. L’ouverture en `file://` (double-clic) ne permet généralement pas `fetch()` sur le JSON.

## Fonctionnement

- `resultat.html` : sélection d’équipe et conteneur pour les résultats.
- `resultat.js` : récupère les résultats, affiche scores, dates, pastilles et liens de sources ; retombe sur `resultats.json` sur site statique.
- `server.js` : sert les fichiers HTML/CSS/JS, appelle l’API et écrit le cache JSON.
- `resultats.json` : cache durable, par équipe, contenant `maj` (ISO 8601) et `matchs`.
- `style.css` : styles d’origine et affichage des résultats.

Chaque match contient `date`, `domicile`, `exterieur`, `butsDomicile`, `butsExterieur`, `resultat` (`V`, `N`, `D`) et `source` (URL vérifiable). Les cinq derniers matchs *terminés* de l’UEFA Champions League masculine sont demandés toutes saisons confondues.

L’API OpenAI ne fournit **pas** une base officielle de résultats sportifs : `web_search` effectue des recherches sur Internet et un modèle extrait les scores. Il peut se tromper, ne pas trouver cinq scores ou fournir des liens imprécis. **Vérifier les sources avant de publier** ; une API sportive dédiée est plus fiable pour des scores officiels. L’API OpenAI peut être facturée séparément de l’abonnement ChatGPT. Les réponses invalides ne remplacent pas le JSON précédent.


## Idées du projet d’origine

- Générer un QR code pour ajouter quelqu’un à la messagerie.
- Permettre de choisir une équipe favorite sur le compte.
- Personnaliser le son de notification.
- Afficher la météo du lieu choisi par l’utilisateur.
