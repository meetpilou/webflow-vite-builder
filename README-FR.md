# Vite Webflow Build System (Prod + Staging)

![Build](https://img.shields.io/badge/build-local%20only-success)
![Environments](https://img.shields.io/badge/env-prod%20%7C%20staging-dual)
![CDN](https://img.shields.io/badge/cdn-Bunny.net-orange)
![Node](https://img.shields.io/badge/node-20.x-339933)
![License](https://img.shields.io/badge/license-MIT-blue)

🌐 [English version → README.md](./README.md)

---

Un workflow moderne pour builder et déployer des assets JavaScript et CSS pour Webflow avec Vite et Bunny CDN. Deux environnements (staging + prod), versioning sémantique sur la prod uniquement, et déploiement direct depuis ta machine — sans GitHub Actions.

---

## 1. Installer les outils (première fois seulement)

Si c'est la première fois que tu mets en place un environnement de dev Node.js, suis ces étapes dans l'ordre.

### 1.1 Installer Homebrew (macOS uniquement)

Homebrew est un gestionnaire de paquets pour macOS. Il te permet d'installer Node.js et d'autres outils en une commande.

Ouvre le Terminal et colle :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Vérifie que ça marche :

```bash
brew --version
```

> 💡 Sur Windows, utilise [nvm-windows](https://github.com/coreybutler/nvm-windows) à la place de Homebrew.

### 1.2 Installer Node.js

Node.js est le moteur qui fait tourner tous les scripts de ce projet.

```bash
brew install node
```

Vérifie l'installation :

```bash
node --version   # doit afficher v20.x.x ou plus
npm --version    # doit afficher 10.x.x ou plus
```

### 1.3 Installer Yarn

Yarn est le gestionnaire de dépendances utilisé dans ce projet. Il est plus rapide que npm et a une meilleure gestion du cache.

```bash
npm install --global yarn
```

Vérifie :

```bash
yarn --version   # doit afficher 1.x.x
```

---

## 2. Installer le projet

```bash
git clone https://github.com/your-username/your-project.git
cd your-project
yarn
```

---

## 3. Lancer le setup

La première chose à faire après `yarn` est de lancer le setup interactif. Il te demande quel preprocesseur CSS tu veux utiliser et configure le projet en conséquence.

```bash
yarn setup
```

Tu verras ce menu :

```
Quel preprocesseur CSS veux-tu utiliser ?
  1. CSS vanilla  (variables CSS natives, simple et moderne)
  2. PostCSS      (autoprefixer + cssnano + postcss-import + postcss-nested)
  3. Sass / SCSS  (variables, mixins, nesting, breakpoints)
```

Le setup crée automatiquement :
- Le fichier CSS de départ dans `src/css/`
- La config `vite.config.js` adaptée
- Le fichier `postcss.config.js` si tu choisis PostCSS
- L'import CSS dans `src/main.js`

Tu peux relancer `yarn setup` à tout moment pour changer de preprocesseur.

---

## 4. Configurer Bunny CDN

Tu as besoin de créer deux choses sur Bunny : une **Storage Zone** (là où les fichiers sont stockés) et une **Pull Zone** (le CDN qui les distribue dans le monde).

### 4.1 Créer une Storage Zone

1. Connecte-toi sur [bunny.net](https://bunny.net)
2. Dans le menu gauche, clique sur **Storage**
3. Clique sur **Add Storage Zone**
4. Donne un nom à ta zone (ex: `mon-projet-storage`)
5. Choisis une région principale (ex: `Falkenstein` pour l'Europe)
6. Clique sur **Add Storage Zone**

Tu en auras besoin plus tard :
- Le **nom** de ta Storage Zone
- Le **mot de passe** (FTP & API Access → clique sur l'œil pour le voir)

### 4.2 Créer une Pull Zone

1. Dans le menu gauche, clique sur **CDN**
2. Clique sur **Add Pull Zone**
3. Donne un nom à ta Pull Zone (ex: `mon-projet`)
4. Dans **Origin Type**, sélectionne **Bunny Storage Zone**
5. Sélectionne la Storage Zone que tu viens de créer
6. Clique sur **Add Pull Zone**

Une fois créée, tu verras ton **CDN Hostname** (ex: `mon-projet.b-cdn.net`). C'est l'URL de base de ton CDN.

### 4.3 Récupérer ta clé API

Cette clé sert à purger le cache CDN après chaque déploiement.

1. Clique sur ton **avatar** en haut à droite
2. Va dans **Account Settings**
3. Clique sur l'onglet **API**
4. Copie ta **API Key**

---

## 5. Configurer le fichier .env

C'est ici que tu stockes tes identifiants Bunny. Ce fichier reste sur ta machine et n'est **jamais envoyé sur Git**.

### 5.1 Créer le fichier

```bash
cp .env.example .env
```

### 5.2 Remplir les variables

Ouvre `.env` dans ton éditeur et remplis les 5 variables :

```env
BUNNY_STORAGE_NAME=mon-projet-storage
BUNNY_STORAGE_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STORAGE_REGION=
BUNNY_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_CDN_URL=https://mon-projet.b-cdn.net
```

Voici où trouver chaque valeur :

| Variable | Où la trouver |
|---|---|
| `BUNNY_STORAGE_NAME` | **Storage** → nom de ta Storage Zone (ex: `mon-projet-storage`) |
| `BUNNY_STORAGE_KEY` | **Storage** → ta zone → **FTP & API Access** → mot de passe (clique sur l'œil) |
| `BUNNY_STORAGE_REGION` | Laisse vide si tu as choisi Falkenstein. Sinon : `uk`, `ny`, `la`, `sg`, `se`, `br` |
| `BUNNY_API_KEY` | **Avatar** → **Account Settings** → **API** → ta clé API |
| `BUNNY_CDN_URL` | **CDN** → ta Pull Zone → **CDN Hostname** (ajoute `https://` devant) |

### 5.3 Vérifier que .env est ignoré par Git

```bash
cat .gitignore | grep .env
```

Tu dois voir `.env` dans la liste. Si ce n'est pas le cas :

```bash
echo ".env" >> .gitignore
```

> ⚠️ Ne partage jamais ton fichier `.env`. Il contient des clés privées qui donnent accès à ton CDN.

---

## 6. Structure du projet

```
dist/
  staging/              ← build staging (pas de versioning, écrasé à chaque save)
    app.js
    app.css
    assets/
  prod/
    latest/             ← build prod actuel (servi par le CDN)
    versions/           ← archives prod (app.js + app.css uniquement)

public/
  assets/
  fonts/

scripts/
  setup.js              ← configuration initiale du projet (CSS preprocesseur)
  bunny.js              ← module partagé upload + purge CDN
  watch.js              ← dev watch + auto-deploy staging à chaque save
  deploy.js             ← déploiement manuel (staging ou prod)
  build.js              ← build prod versionné + deploy
  restore.js            ← restauration d'une version prod
  reset.js              ← remise à zéro complète
  snippet.js            ← génération du snippet Webflow

src/
  js/
  css/
    main.css            ← (ou main.scss selon le setup)
  main.js

postcss.config.js       ← généré par yarn setup si PostCSS est choisi
vite.config.js          ← mis à jour automatiquement par yarn setup
.env                    ← tes identifiants locaux (jamais commité)
.env.example            ← template à copier
package.json
```

---

## 7. Workflow typique

### 7.1 Développement local (watch)

```bash
yarn dev
```

Démarre Vite en mode watch. À chaque fois que tu sauvegardes un fichier :

1. Vite rebuilde `app.js` + `app.css` (non minifié, avec sourcemaps)
2. Les fichiers sont uploadés automatiquement sur Bunny CDN → `staging/`
3. Le cache CDN est purgé immédiatement

L'URL staging ne change jamais :
```
https://mon-projet.b-cdn.net/staging/app.js
https://mon-projet.b-cdn.net/staging/app.css
```

Ton snippet Webflow pointe toujours dessus — pas besoin de toucher quoi que ce soit dans Webflow pendant le dev.

### 7.2 Build production

Quand tu es prêt à passer en prod :

```bash
yarn build          # bump patch : 0.0.4 → 0.0.5
yarn build:minor    # bump minor : 0.0.4 → 0.1.0
yarn build:major    # bump major : 0.0.4 → 1.0.0
```

Chaque build :
1. Adopte le build staging existant (ou rebuilde si pas de staging)
2. Incrémente la version
3. Archive `app.js` + `app.css` dans `dist/prod/versions/`
4. Déploie automatiquement sur Bunny CDN → `prod/latest/`

### 7.3 Déploiement manuel (sans rebuild)

Si tu veux pousser ce qui est déjà dans `dist/` sans rebuilder :

```bash
yarn deploy:staging
yarn deploy:prod
```

Utile après une restauration ou en cas de problème CDN.

### 7.4 Exemple de workflow complet

```bash
# 1. Configurer le projet (une seule fois)
yarn setup

# 2. Remplir .env avec tes identifiants Bunny

# 3. Développer
yarn dev
# → sauvegarde → auto-deploy staging à chaque save

# 4. Tester sur Webflow staging (*.webflow.io)

# 5. Passer en prod
yarn build

# 6. Publier le site Webflow (le vrai domaine charge la prod)

# 7. Quelque chose ne va pas ? Rollback en 10 secondes
yarn restore prod 0.0.4
yarn deploy:prod
```

---

## 8. Architecture de déploiement

Tout se passe **depuis ta machine** — aucune dépendance à GitHub Actions ou à un serveur CI.

| Commande | Build | Deploy |
|---|---|---|
| `yarn dev` | Watch non-minifié | Auto-deploy staging à chaque save |
| `yarn build` | Build prod (patch) | Auto-deploy prod |
| `yarn build:minor` | Build prod (minor) | Auto-deploy prod |
| `yarn build:major` | Build prod (major) | Auto-deploy prod |
| `yarn deploy:staging` | Aucun | Push `dist/staging/` → CDN |
| `yarn deploy:prod` | Aucun | Push `dist/prod/latest/` → CDN |

Structure des dossiers sur Bunny CDN :

```
staging/         ← écrasé à chaque save en dev, pas de versioning
  app.js
  app.css
  assets/

prod/
  latest/        ← version courante en prod
    app.js
    app.css
    assets/
```

---

## 9. Versioning (prod uniquement)

**Le staging n'est pas versionné.** `yarn dev` écrase toujours `staging/` directement à chaque save. Il n'y a pas d'historique, pas d'archives, pas de rollback pour le staging — c'est voulu, c'est un environnement de développement en temps réel.

**Le versioning s'applique uniquement à la prod.** Quand tu lances `yarn build` :

**Cas A — Un build staging existe**
- Le build staging est directement promu en prod (pas de rebuild)
- La version est incrémentée selon le flag (patch/minor/major)
- Les fichiers sont archivés dans `dist/prod/versions/vX.X.X/`

**Cas B — Pas de build staging**
- Vite rebuilde directement pour la prod (minifié)
- La version est incrémentée
- Les fichiers sont archivés

Dans les deux cas, le résultat est déployé automatiquement sur Bunny CDN.

---

## 10. Restaurer une version prod

```bash
yarn restore prod 1.2.3
yarn deploy:prod
```

Restaure `app.js` + `app.css` dans `dist/prod/latest/` depuis l'archive, puis déploie sur le CDN.

Pour voir toutes les versions disponibles :

```bash
cat dist/prod/versions/versions.json
```

---

## 11. Remise à zéro

```bash
yarn reset --yes
```

Supprime `dist/`, remet `package.json` à `0.0.1`, recrée une structure vide.

---

## 12. Snippet Webflow

Génère ton snippet CDN pour Webflow :

```bash
yarn snippet https://mon-projet.b-cdn.net
```

Ouvre `dist/snippet.html`, copie les deux loaders (CSS + JS) et colle-les dans :
**Webflow → Project Settings → Custom Code → Inside `<head>`**

Le loader détecte automatiquement l'environnement :
- Sur `*.webflow.io` → charge `staging/app.js`
- Sur ton vrai domaine → charge `prod/latest/app.js`

Un seul snippet dans Webflow, deux environnements gérés automatiquement.

---

## 13. Preprocesseurs CSS disponibles

Tu peux changer de preprocesseur à tout moment en relançant `yarn setup`.

### CSS vanilla
Idéal pour les projets simples. Utilise les variables CSS natives (`:root { --color: ... }`), supportées par tous les navigateurs modernes. Aucune configuration supplémentaire.

### PostCSS
Le plus polyvalent. Inclut :
- **postcss-import** : permet de diviser ton CSS en plusieurs fichiers et de les importer avec `@import`
- **postcss-nested** : syntaxe de nesting comme Sass (`& .child {}`, `&:hover {}`)
- **autoprefixer** : ajoute automatiquement les préfixes navigateur (`-webkit-`, `-moz-`, etc.)
- **cssnano** : minifie le CSS en production

### Sass / SCSS
Idéal si tu viens d'un background Sass ou si tu as besoin de variables, mixins, fonctions et breakpoints.

---

## 14. ESLint + Prettier

```bash
yarn lint
yarn lint:fix
yarn format
```

---

## 15. Licence

MIT — libre d'utilisation, modification et distribution.
