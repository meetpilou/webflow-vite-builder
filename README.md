# Vite Webflow Build System (Prod + Staging)

![Build](https://img.shields.io/badge/build-local%20only-success)
![Environments](https://img.shields.io/badge/env-prod%20%7C%20staging-dual)
![CDN](https://img.shields.io/badge/cdn-Bunny.net-orange)
![Node](https://img.shields.io/badge/node-20.x-339933)
![License](https://img.shields.io/badge/license-MIT-blue)

---

A modern workflow for building and deploying JavaScript and CSS assets for Webflow using Vite and Bunny CDN. Two environments (staging + prod), semantic versioning on prod only, and direct deployment from your machine — no GitHub Actions required.

---

## 1. Install the tools (first time only)

If this is your first time setting up a Node.js development environment, follow these steps in order.

### 1.1 Install Homebrew (macOS only)

Homebrew is a package manager for macOS. It lets you install Node.js and other tools with a single command.

Open Terminal and paste:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify it works:

```bash
brew --version
```

> 💡 On Windows, use [nvm-windows](https://github.com/coreybutler/nvm-windows) instead of Homebrew.

### 1.2 Install Node.js

Node.js is the engine that runs all the scripts in this project.

```bash
brew install node
```

Verify the installation:

```bash
node --version   # should show v20.x.x or higher
npm --version    # should show 10.x.x or higher
```

### 1.3 Install Yarn

Yarn is the package manager used in this project. It's faster than npm and has better cache management.

```bash
npm install --global yarn
```

Verify:

```bash
yarn --version   # should show 1.x.x
```

---

## 2. Install the project

```bash
git clone https://github.com/your-username/your-project.git
cd your-project
yarn
```

---

## 3. Run the setup

The first thing to do after `yarn` is to run the interactive setup. It asks which CSS preprocessor you want to use and configures the project accordingly.

```bash
yarn setup
```

You'll see this menu:

```
Which CSS preprocessor do you want to use?
  1. CSS vanilla  (native CSS variables, simple and modern)
  2. PostCSS      (autoprefixer + cssnano + postcss-import + postcss-nested)
  3. Sass / SCSS  (variables, mixins, nesting, breakpoints)
```

Setup automatically creates:
- The CSS starter file in `src/css/`
- The matching `vite.config.js` config
- The `postcss.config.js` file if you choose PostCSS
- The CSS import in `src/main.js`

You can re-run `yarn setup` at any time to switch preprocessors.

---

## 4. Configure Bunny CDN

You need to create two things on Bunny: a **Storage Zone** (where files are stored) and a **Pull Zone** (the CDN that distributes them worldwide).

### 4.1 Create a Storage Zone

1. Log in to [bunny.net](https://bunny.net)
2. In the left menu, click **Storage**
3. Click **Add Storage Zone**
4. Give your zone a name (e.g. `my-project-storage`)
5. Choose a primary region (e.g. `Falkenstein` for Europe)
6. Click **Add Storage Zone**

You'll need later:
- The **name** of your Storage Zone
- The **password** (FTP & API Access → click the eye icon to reveal it)

### 4.2 Create a Pull Zone

1. In the left menu, click **CDN**
2. Click **Add Pull Zone**
3. Give your Pull Zone a name (e.g. `my-project`)
4. Under **Origin Type**, select **Bunny Storage Zone**
5. Select the Storage Zone you just created
6. Click **Add Pull Zone**

Once created, you'll see your **CDN Hostname** (e.g. `my-project.b-cdn.net`). This is the base URL of your CDN.

### 4.3 Get your API key

This key is used to purge the CDN cache after each deployment.

1. Click your **avatar** in the top right
2. Go to **Account Settings**
3. Click the **API** tab
4. Copy your **API Key**

### 4.4 Configure browser cache for JS and CSS files

By default, Bunny CDN tells browsers to cache your files for a long time. This is great for static assets like images, but problematic for your `app.js` and `app.css` — the browser might serve a stale version even after you've deployed a new one.

The fix: tell the browser **never to cache** JS and CSS files. The CDN still caches them on its edge servers (fast delivery), but every time the browser loads the page it asks Bunny for the freshest version.

There are two ways to set this up. **Use the Edge Rule** — it's more precise and only affects JS/CSS.

#### Option A — Edge Rule (recommended)

An Edge Rule lets you override the browser cache time for specific file types only.

1. In your Pull Zone, go to **Edge rules** in the left menu
2. Click **Add rule**
3. Fill in:
   - **Description**: `Javascript and CSS Files`
   - **Action**: `Override Browser Cache Time` → Cache Time In Seconds: `0`
   - **Condition**: File Extension → Match any → add `js` and `css`
4. Save the rule

With `Cache Time In Seconds: 0`, Bunny sends a `Cache-Control: no-cache` header to the browser for every `.js` and `.css` request. The browser always revalidates with the CDN before using a cached copy.

> ✅ Images, fonts, and other assets are unaffected — they keep their normal long cache time.

#### Option B — Global setting (simpler but broader)

If you prefer not to use Edge Rules, you can set the browser cache globally:

1. In your Pull Zone, go to **Caching → General**
2. Under **Browser cache expiration time**, select **Override: do not cache**
3. Save

> ⚠️ This disables browser caching for **all files** served by this Pull Zone, including images and fonts. Use Option A if you want finer control.

#### Why this matters

This project purges the **Bunny CDN cache** on every deploy (`yarn build`, `yarn dev`). But the CDN cache and the browser cache are separate layers:

```
Browser cache  →  Bunny CDN edge cache  →  Bunny Storage (origin)
```

Even after purging the CDN, a browser that has cached `app.js` locally will keep using its old copy until the browser cache expires. Setting the browser cache to `0` ensures users always get the latest version immediately after a deploy.

---

## 5. Configure the .env file

This is where you store your Bunny credentials. This file stays on your machine and is **never sent to Git**.

### 5.1 Create the file

```bash
cp .env.example .env
```

### 5.2 Fill in the variables

Open `.env` in your editor and fill in the 5 variables:

```env
BUNNY_STORAGE_NAME=my-project-storage
BUNNY_STORAGE_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STORAGE_REGION=
BUNNY_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_CDN_URL=https://my-project.b-cdn.net
```

Where to find each value:

| Variable | Where to find it |
|---|---|
| `BUNNY_STORAGE_NAME` | **Storage** → your Storage Zone name (e.g. `my-project-storage`) |
| `BUNNY_STORAGE_KEY` | **Storage** → your zone → **FTP & API Access** → password (click the eye icon) |
| `BUNNY_STORAGE_REGION` | Leave empty for Falkenstein. Otherwise: `uk`, `ny`, `la`, `sg`, `se`, `br` |
| `BUNNY_API_KEY` | **Avatar** → **Account Settings** → **API** → your API key |
| `BUNNY_CDN_URL` | **CDN** → your Pull Zone → **CDN Hostname** (add `https://` in front) |

### 5.3 Make sure .env is ignored by Git

```bash
cat .gitignore | grep .env
```

You should see `.env` in the list. If not:

```bash
echo ".env" >> .gitignore
```

> ⚠️ Never share your `.env` file. It contains private keys that give access to your CDN.

---

## 6. Project structure

```
dist/
  staging/              ← staging build (no versioning, overwritten on every save)
    app.js
    app.css
    assets/
  prod/
    latest/             ← current prod build (served by the CDN)
    versions/           ← prod archives (app.js + app.css only)

public/
  assets/
  fonts/

scripts/
  setup.js              ← initial project setup (CSS preprocessor)
  bunny.js              ← shared upload + CDN purge module
  watch.js              ← dev watch + auto-deploy staging on every save
  deploy.js             ← manual deployment (staging or prod)
  build.js              ← versioned prod build + deploy
  restore.js            ← restore a prod version
  reset.js              ← full reset
  snippet.js            ← generate the Webflow snippet

src/
  js/
  css/
    main.css            ← (or main.scss depending on setup)
  main.js

postcss.config.js       ← generated by yarn setup if PostCSS is chosen
vite.config.js          ← automatically updated by yarn setup
.env                    ← your local credentials (never committed)
.env.example            ← template to copy
package.json
```

---

## 7. Typical workflow

### 7.1 Local development (watch)

```bash
yarn dev
```

Starts Vite in watch mode. Every time you save a file:

1. Vite rebuilds `app.js` + `app.css` (non-minified, with sourcemaps)
2. Files are automatically uploaded to Bunny CDN → `staging/`
3. CDN cache is purged immediately

The staging URL never changes:
```
https://my-project.b-cdn.net/staging/app.js
https://my-project.b-cdn.net/staging/app.css
```

Your Webflow snippet always points to it — no need to touch anything in Webflow while developing.

### 7.2 Production build

When you're ready to go to prod:

```bash
yarn build          # bump patch: 0.0.4 → 0.0.5
yarn build:minor    # bump minor: 0.0.4 → 0.1.0
yarn build:major    # bump major: 0.0.4 → 1.0.0
```

Each build:
1. Adopts the existing staging build (or rebuilds from source if no staging)
2. Increments the version
3. Archives `app.js` + `app.css` in `dist/prod/versions/`
4. Automatically deploys to Bunny CDN → `prod/latest/`

### 7.3 Manual deployment (without rebuilding)

If you want to push what's already in `dist/` without rebuilding:

```bash
yarn deploy:staging
yarn deploy:prod
```

Useful after a restore or if there was a CDN issue.

### 7.4 Full workflow example

```bash
# 1. Configure the project (once)
yarn setup

# 2. Fill in .env with your Bunny credentials

# 3. Start developing
yarn dev
# → save → auto-deploy staging on every save

# 4. Test on Webflow staging (*.webflow.io)

# 5. Go to prod
yarn build

# 6. Publish your Webflow site (the real domain loads prod)

# 7. Something wrong? Rollback in 10 seconds
yarn restore prod 0.0.4
yarn deploy:prod
```

---

## 8. Deployment architecture

Everything runs **from your machine** — no dependency on GitHub Actions or any CI server.

| Command | Build | Deploy |
|---|---|---|
| `yarn dev` | Non-minified watch | Auto-deploy staging on every save |
| `yarn build` | Prod build (patch) | Auto-deploy prod |
| `yarn build:minor` | Prod build (minor) | Auto-deploy prod |
| `yarn build:major` | Prod build (major) | Auto-deploy prod |
| `yarn deploy:staging` | None | Push `dist/staging/` → CDN |
| `yarn deploy:prod` | None | Push `dist/prod/latest/` → CDN |

Folder structure on Bunny CDN:

```
staging/         ← overwritten on every save in dev, no versioning
  app.js
  app.css
  assets/

prod/
  latest/        ← current prod version
    app.js
    app.css
    assets/
```

---

## 9. Versioning (prod only)

**Staging is not versioned.** `yarn dev` always overwrites `staging/` directly on every save. There is no history, no archives, no rollback for staging — this is intentional, it's a real-time development environment.

**Versioning applies to prod only.** When you run `yarn build`:

**Case A — A staging build exists**
- The staging build is directly promoted to prod (no rebuild)
- The version is incremented according to the flag (patch/minor/major)
- Files are archived in `dist/prod/versions/vX.X.X/`

**Case B — No staging build**
- Vite rebuilds directly for prod (minified)
- The version is incremented
- Files are archived

In both cases, the result is automatically deployed to Bunny CDN.

---

## 10. Restore a prod version

```bash
yarn restore prod 1.2.3
yarn deploy:prod
```

Restores `app.js` + `app.css` into `dist/prod/latest/` from the archive, then deploys to the CDN.

To see all available versions:

```bash
cat dist/prod/versions/versions.json
```

---

## 11. Full reset

```bash
yarn reset --yes
```

Deletes `dist/`, resets `package.json` to `0.0.1`, recreates an empty structure.

---

## 12. Webflow snippet

Generate your CDN snippet for Webflow:

```bash
yarn snippet https://my-project.b-cdn.net
```

Open `dist/snippet.html`, copy the two loaders (CSS + JS) and paste them into:
**Webflow → Project Settings → Custom Code → Inside `<head>`**

The loader automatically detects the environment:
- On `*.webflow.io` → loads `staging/app.js`
- On your real domain → loads `prod/latest/app.js`

One single snippet in Webflow, two environments handled automatically.

---

## 13. Available CSS preprocessors

You can switch preprocessors at any time by re-running `yarn setup`.

### CSS vanilla
Ideal for simple projects. Uses native CSS variables (`:root { --color: ... }`), supported by all modern browsers. No extra configuration needed.

### PostCSS
The most versatile option. Includes:
- **postcss-import**: split your CSS into multiple files and import them with `@import`
- **postcss-nested**: Sass-like nesting syntax (`& .child {}`, `&:hover {}`)
- **autoprefixer**: automatically adds browser prefixes (`-webkit-`, `-moz-`, etc.)
- **cssnano**: minifies CSS in production

### Sass / SCSS
Ideal if you come from a Sass background or need variables, mixins, functions and breakpoints. 

---

## 14. ESLint + Prettier

```bash
yarn lint
yarn lint:fix
yarn format
```

---

## 15. License

MIT — free to use, modify and distribute.
