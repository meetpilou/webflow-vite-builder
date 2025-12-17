# Vite Webflow Build System (Prod + Staging)

![Build](https://img.shields.io/badge/build-local%20only-success)
![Environments](https://img.shields.io/badge/env-prod%20%7C%20staging-dual)
![CDN](https://img.shields.io/badge/cdn-Bunny.net-orange)
![Node](https://img.shields.io/badge/node-20.x-339933)
![License](https://img.shields.io/badge/license-MIT-blue)

A modern and beginner-friendly workflow for building and deploying JavaScript and CSS assets for Webflow using Vite and Bunny CDN, with **two environments** (staging + prod) and **intelligent semantic versioning**.

This project includes:

- Fast Vite dev server
- Local-only builds (no accidental CI builds)
- Dual environment system: **staging** + **prod**
- Intelligent versioning (prod never ahead of staging)
- Rollback system per environment
- CDN deployment via Bunny.net
- Slater-style loader snippet for Webflow
- Reset tools
- ESLint + Prettier

---

## 1. Requirements

You need:

- macOS / Windows / Linux
- GitHub account
- Bunny.net account
- Node.js installed
- (Optional) Webflow project

---

## 2. Install Node.js, npm, and Yarn

Download Node.js (LTS):  
https://nodejs.org/

Check installation:

    node -v
    npm -v

Install Yarn:

    npm install --global yarn

Check installation:

    yarn -v

---

## 3. Clone the Repository

    git clone https://github.com/your-username/your-project.git
    cd your-project
    yarn

---

## 4. Setting Up Bunny CDN

This project deploys your build output to **Bunny Storage** and serves it through a **Bunny Pull Zone CDN**.

### 4.1 Create a Storage Zone

Example:

- Storage Zone Name: myproject-storage
- Hostname: myproject-storage.b-cdn.net
- FTP Username: auto-generated
- FTP Password: shown once

For better performance, choose **SSD Storage** and enable **Perma-Cache**.

### 4.2 Create a Pull Zone

Example:

- Pull Zone Name: myproject
- CDN URL: https://myproject.b-cdn.net/

This CDN URL will be used in Webflow.

### 4.3 Enable Smart Cache

In your Pull Zone:

- Open the **Caching** tab
- Enable **Smart Cache**

This provides smarter invalidation and better performance worldwide.

---

## 5. Bunny Setup + GitHub Secrets

This project deploys your JS/CSS and public files to Bunny Storage and serves them through a Bunny Pull Zone. Here is how to get each value used as GitHub secrets.

### 5.1 Retrieve the Pull Zone ID (BUNNY_PULLZONE_ID)

1. Go to **Pull Zones**
2. Find your Pull Zone in the list
3. Click the **three dots** on the right
4. Select **“Copy Pull Zone ID”**

This gives you the numeric ID used for cache purging.

### 5.2 Retrieve the Storage Name & Storage Key

1. Go to **Storage → Your Storage Zone**
2. Enter the zone
3. Open **“FTP & API Access”**

You will see:

- FTP Username → this is **BUNNY_STORAGE_NAME**
- FTP Password → this is **BUNNY_STORAGE_KEY**

If you lose the password, generate a new one.

### 5.3 Retrieve your Account API Key

1. Go to **Account Settings**
2. Open **API Key**

Copy the **Main API Key**.  
This becomes **BUNNY_API_KEY** and is used to purge Bunny CDN cache.

### 5.4 Add these secrets to GitHub

In your repository:

- Go to **Settings → Secrets and variables → Actions → New repository secret**

Add:

- `BUNNY_STORAGE_NAME` → Storage FTP username
- `BUNNY_STORAGE_KEY` → Storage FTP password
- `BUNNY_PULLZONE_ID` → Pull Zone ID (numeric)
- `BUNNY_API_KEY` → Account API key

The GitHub Actions workflow will use these to:

- Upload files to Bunny Storage
- Purge the Pull Zone cache after each deploy

> Note: The workflow only deploys existing files from `dist/`.  
> **Builds are always done locally**, so you never break production by mistake.

---

## 6. Project Structure

    dist/
      prod/
        latest/
        versions/
          versions.json
      staging/
        latest/
        versions/
          versions.json
      snippet.html

    public/
      assets/
      fonts/

    scripts/
      build.js
      restore.js
      reset.js
      generate-snippet.js

    src/
      js/
      css/
      main.js

    .eslintrc.json
    .prettierrc
    vite.config.js
    package.json

---

## 7. What Is Vite?

Vite is a fast development server and build tool.

### Dev mode

    yarn dev

This starts a local server on:

    http://localhost:3000

When you edit files in `src/`, the browser updates almost instantly.

### Build mode

For each build, Vite outputs:

    app.js
    app.css
    assets/

These files are what you deploy to Bunny CDN.

---

## 8. Dual Build System — Prod + Staging (Intelligent Versioning)

This project uses two environments:

- **staging** → used on `*.webflow.io` (preview / QA)
- **prod** → used on your real domain (live site)

Build scripts (from `package.json`):

Staging builds:

    yarn build:staging          # bump patch by default
    yarn build:staging:minor    # bump minor
    yarn build:staging:major    # bump major

Production builds:

    yarn build:prod             # bump patch if needed
    yarn build:prod:minor       # bump minor if needed
    yarn build:prod:major       # bump major if needed

### 8.1 How versioning works

The version is stored in `package.json` and tracked separately per environment under:

- `dist/staging/versions/versions.json`
- `dist/prod/versions/versions.json`

**Staging rules**

- Every staging build **always** increments the version (patch/minor/major).
- The build is written to `dist/staging/latest`.
- An archive is created under `dist/staging/versions/vX.X.X`.

**Production rules (intelligent)**

When you run a production build:

1. It compares the latest staging version and the latest prod version.
2. Three possible situations:

**A. Staging is ahead of prod**

- Example: staging = 0.0.5, prod = 0.0.4
- Result: prod adopts **0.0.5** (no increment).
- The staging build is copied into `dist/prod/latest`.

**B. Staging equals prod**

- Example: staging = 0.0.4, prod = 0.0.4
- Result: prod **increments** the version (patch/minor/major according to the script).
- Example: prod patch → 0.0.5
- The new prod build is also copied back to staging, so both environments share the same version.

**C. No staging build yet**

- Example: first prod build on a fresh project.
- Result: prod increments from the current `package.json` version and then copies that version to staging as well.

> The key idea:
>
> - **Staging is never behind production.**
> - **Prod never jumps to a version that staging doesn’t know.**

---

## 9. Example Version Timeline

Starting from:

- package.json → 0.0.3
- no previous builds

1.  First staging build:

        yarn build:staging

    → staging = 0.0.4  
    → prod still = 0.0.3 (no build yet)

2.  First production build:

        yarn build:prod

    - staging latest = 0.0.4
    - prod latest = 0.0.3  
      → prod adopts 0.0.4 (no increment)  
      → prod and staging both = 0.0.4

3.  New features, you skip staging and go straight to prod:

        yarn build:prod:minor

    - staging latest = 0.0.4
    - prod latest = 0.0.4  
      → equality → prod bumps **minor** → 0.1.0  
      → staging is automatically synced to 0.1.0

4.  Later, you do a staging-only patch:

        yarn build:staging

    → staging = 0.1.1  
    → prod = 0.1.0

5.  When ready to push to live:

        yarn build:prod

    → prod adopts staging version 0.1.1 (no increment).

Versions are always clean and predictable.

---

## 10. Restore a Version

You can restore any previous version per environment.

Restore production:

    yarn restore prod 1.2.3

Restore staging:

    yarn restore staging 1.2.3

- For **staging**, only staging is updated.
- For **prod**, the script also syncs staging to the restored version, so both environments remain aligned.

---

## 11. Reset the Project

The reset command wipes all builds and archives, and resets the version to `0.0.1`.

    yarn reset --yes

This will:

- Delete `dist/` completely
- Reset `package.json` version to `0.0.1`
- Recreate empty folders for:

      dist/prod/latest
      dist/prod/versions/versions.json
      dist/staging/latest
      dist/staging/versions/versions.json

> The `--yes` flag is required as a safety guard.

---

## 12. Using Your Scripts Inside Webflow (Local / Staging / Prod)

There are two ways to load your scripts in Webflow:

- Local dev → Vite server
- Staging/Prod → Bunny CDN + loader snippet

### 12.1 Local development (Vite dev server)

When you run:

    yarn dev

You can inject the local Vite scripts inside Webflow:

    <!-- Local development (do NOT publish this to production) -->
    <script type="module" src="http://localhost:3000/@vite/client"></script>
    <script type="module" src="http://localhost:3000/src/main.js"></script>

Benefits:

- Hot module reload
- Instant JS/CSS updates
- Real dev environment inside Webflow
- No build required while coding

⚠ Only use this for **local testing**.  
⚠ Do **not** publish your site with these tags.

---

### 12.2 Staging / Production (CDN loader snippet)

Once your assets are built (**staging** or **production**), Webflow loads them through a **single CDN loader setup**.

Generate the snippet:

```bash
yarn snippet https://your-project.b-cdn.net
```

This creates:

```txt
dist/snippet.html
```

Open `dist/snippet.html`, copy the **minified loader snippets**, and paste them into:

- **Webflow → Project Settings → Custom Code → Inside `<head>`**

> ℹ️ CSS and JS are loaded via **two independent snippets**. You may enable or disable either one if needed.

---

#### Auto environment loaders (minified)

**CSS loader**

```html
<!-- -------------------- AUTO ENV CSS LOADER -------------------- -->
<script>
  (function () {
    const C = 'https://your-project.b-cdn.net',
      p = new URLSearchParams(location.search),
      o = p.get('env'),
      e =
        o === 'staging' ? 'staging' : location.hostname.includes('webflow.io') ? 'staging' : 'prod',
      u = `${C}/${e}/latest/app.css`,
      l = document.createElement('link');
    ((l.rel = 'stylesheet'), (l.href = u), document.head.appendChild(l));
  })();
</script>
```

**JS loader**

```html
<!-- -------------------- AUTO ENV JS LOADER -------------------- -->
<script>
  (function () {
    const C = 'https://your-project.b-cdn.net',
      p = new URLSearchParams(location.search),
      o = p.get('env'),
      e =
        o === 'staging' ? 'staging' : location.hostname.includes('webflow.io') ? 'staging' : 'prod',
      u = `${C}/${e}/latest/app.js`,
      s = document.createElement('script');
    ((s.src = u), (s.type = 'text/javascript'), (s.defer = !0), document.head.appendChild(s));
  })();
</script>
```

---

#### How the loader works

The loader automatically selects the correct environment:

- 🚧 **Staging**
  - Used on `*.webflow.io`
  - Forced when `?env=staging` is present in the URL
- 💎 **Production**
  - Used on the real (custom) domain

You maintain **one single loader configuration** in Webflow, and it always points to the correct CDN environment.

---

#### Explicit CDN URLs (debug / QA / fallback)

If you need to bypass the auto loader (for testing or debugging), use the direct CDN URLs below.

**CSS**

```html
<!-- 🚧 Staging -->
<link href="https://your-project.b-cdn.net/staging/latest/app.css" rel="stylesheet" />

<!-- 💎 Production -->
<link href="https://your-project.b-cdn.net/prod/latest/app.css" rel="stylesheet" />
```

**JS**

```html
<!-- 🚧 Staging -->
<script src="https://your-project.b-cdn.net/staging/latest/app.js" defer></script>

<!-- 💎 Production -->
<script src="https://your-project.b-cdn.net/prod/latest/app.js" defer></script>
```

---

#### Why this approach

- ✅ Single snippet setup in Webflow
- ✅ Automatic environment detection
- ✅ No manual switch between staging and production
- ✅ Compatible with Webflow + Vite workflows
- ✅ Easy fallback with explicit CDN URLs

---

## 13. ESLint + Prettier

Lint your code:

    yarn lint

Fix issues automatically:

    yarn lint:fix

Format all files:

    yarn format

Configuration files:

- `.eslintrc.json`
- `.prettierrc`

They are preconfigured for modern JavaScript (ES2025), with rules like `no-unused-vars`, `prefer-const`, `no-var`, and enforced formatting via Prettier.

---

## 14. Typical Workflow

1. Install dependencies:

   yarn

2. Start local dev:

   yarn dev

3. Build a staging version (before testing on Webflow):

   yarn build:staging

4. Commit + push to GitHub → your GitHub Action deploys the **current dist/** to Bunny.

5. Test on your Webflow staging domain (`*.webflow.io`).

6. When ready for production:

   yarn build:prod

7. Publish your Webflow site (real domain uses prod assets).

8. If something goes wrong in prod:

   yarn restore prod 0.0.4

---

## 15. License

MIT License — you are free to use, modify, and distribute this starter in personal and commercial projects.

---

## 16. You’re Ready

With this setup, you have:

- A clean Vite + Webflow integration
- Dual environments with intelligent versioning
- Safe, local-only builds (no surprise prod builds from CI)
- Fast global delivery via Bunny CDN
- A simple loader snippet that automatically picks staging or prod
- Linting and formatting baked in

Perfect for high-performance, maintainable Webflow projects with a professional deployment workflow.
