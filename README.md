# Messagerie des Champions (MDC) ⚽

**Messagerie des Champions** est un projet web destiné aux supporters de football. Il permet de discuter dans des salons et de consulter les derniers résultats de plusieurs équipes de la **Ligue des champions de l'UEFA**.

## Fonctionnalités

- **Accueil** : présentation du projet et navigation entre les pages.
- **Connexion et inscription** : authentification des utilisateurs avec Supabase.
- **Messagerie** : création de salons et échanges de messages entre supporters via Supabase.
- **Résultats** : consultation des cinq derniers matchs enregistrés pour huit clubs (Atlético de Madrid, Bayern Munich, Real Madrid, PSG, FC Barcelone, Liverpool, Manchester City et Inter Milan).
- **Paramètres** : affichage du compte et déconnexion.

Dans la page **Résultats**, chaque rencontre indique la date, le score, un lien vers la source et une pastille : **V** (victoire), **N** (match nul) ou **D** (défaite).

## Important : pourquoi les résultats sont enregistrés en JSON

> **La clé API OpenAI utilisée pendant le développement ne sera pas fournie avec le projet.**
>
> Pour que les résultats restent consultables sans cette clé, **nous avons sauvegardé les données récupérées dans le fichier `resultats.json`**. Le fichier contient déjà les résultats enregistrés des huit équipes. Il n'est donc **pas nécessaire de posséder une clé API OpenAI** pour consulter ces résultats.

Sans clé API, le site affiche les **données déjà sauvegardées** : elles ne se mettent pas à jour automatiquement. Le bouton **« Actualiser les résultats »** ne lance pas de nouvelle recherche tant qu'aucune clé n'est configurée.

**Si vous voulez essayer vous-même la recherche et l'actualisation des résultats, vous pouvez ajouter votre propre clé API OpenAI.** La procédure est expliquée ci-dessous.

## Installation et lancement

**Prérequis :** [Node.js](https://nodejs.org/) version 18 ou supérieure.

1. Télécharger ou extraire le projet.
2. Ouvrir un terminal dans le dossier contenant `server.js` et `package.json`.
3. Démarrer le serveur :

   ```bash
   npm start
   ```

   Vous pouvez aussi utiliser `node server.js`. Aucune installation de dépendances avec `npm install` n'est nécessaire pour le serveur.

4. Ouvrir l'adresse **http://127.0.0.1:3000** dans un navigateur, puis accéder à l'onglet **Résultats** (ou directement à http://127.0.0.1:3000/resultat.html).
5. Sélectionner une équipe pour voir les résultats enregistrés.

**À noter :** ouvrir directement les fichiers HTML par double-clic (`file://`) peut empêcher le chargement du JSON. Il faut lancer le serveur ou utiliser un hébergement web HTTP(S).

## Facultatif : tester avec votre propre clé API OpenAI

Vous pouvez configurer votre propre clé pour essayer de rechercher des résultats plus récents avec l'API OpenAI. Pour cela, créez une clé depuis [la plateforme OpenAI](https://platform.openai.com/api-keys), puis définissez la variable d'environnement `OPENAI_API_KEY` **dans le terminal avant de démarrer le serveur**.

**Windows — PowerShell :**

```powershell
$env:OPENAI_API_KEY="votre_cle_api_ici"
npm start
```

**macOS / Linux :**

```bash
export OPENAI_API_KEY="votre_cle_api_ici"
npm start
```

Ensuite, ouvrez la page **Résultats**, choisissez une équipe et cliquez sur **« Actualiser les résultats »**. Si la requête aboutit et que les résultats sont valides, le serveur les enregistre dans `resultats.json` pour les prochaines utilisations, y compris sans clé API.

**Attention :**

- **Ne publiez jamais votre clé API** dans le README, `server.js`, un fichier HTML ou du JavaScript exécuté dans le navigateur. La variable d'environnement permet de la garder hors des fichiers du projet.
- L'utilisation de l'API OpenAI et de la recherche web peut entraîner **des frais** selon votre compte ; un abonnement ChatGPT ne fournit pas automatiquement des crédits API.
- Le serveur conserve les données enregistrées si la recherche échoue. Il limite aussi les nouvelles tentatives pour une même équipe à **une toutes les cinq minutes**.
- Les recherches utilisent un modèle OpenAI compatible avec la fonctionnalité de recherche web. Le modèle peut être personnalisé avec la variable d'environnement `OPENAI_MODEL` si nécessaire.

## Structure du projet

```text
MDC-main/
├── index.html           # Accueil
├── connexion.html       # Connexion et inscription
├── conversation.html    # Messagerie
├── resultat.html        # Affichage des résultats
├── parametre.html       # Paramètres du compte
├── style.css            # Styles des pages
├── js/                  # Scripts côté navigateur
│   ├── resultat.js      # Chargement et affichage des résultats
│   ├── spclient.js      # Configuration du client Supabase
│   └── ...
├── img/                 # Images et logos
├── server.js            # Serveur local et appel facultatif à OpenAI
├── resultats.json       # Résultats sauvegardés, consultables sans clé API
└── package.json         # Commande de lancement
```

## Comment fonctionnent les résultats ?

Le navigateur demande les résultats au serveur Node.js. **Sans clé OpenAI**, le serveur renvoie simplement les matchs enregistrés dans `resultats.json`. Si l'API du serveur n'est pas disponible (par exemple sur un site statique), la page essaie de lire directement ce même fichier JSON.

**Avec une clé OpenAI**, le serveur peut effectuer une recherche web par l'intermédiaire de l'API OpenAI, vérifier le format des résultats et mettre à jour le JSON. Les données sauvegardées sont une **copie à un moment donné**, et non un flux de résultats en direct. Les réponses générées à partir de recherches web peuvent comporter des erreurs : il est conseillé de vérifier les scores à l'aide des liens sources, notamment avant de les réutiliser.

**La messagerie et l'authentification utilisent Supabase**, indépendamment de la clé API OpenAI. Leur bon fonctionnement dépend de la configuration et de l'accès au projet Supabase correspondant. Le fichier `resultats.json` ne sauvegarde pas les conversations ou les comptes utilisateurs.

## Technologies

HTML, CSS, JavaScript, JSON, Node.js (sans dépendances serveur supplémentaires), Supabase et API OpenAI avec recherche web.
