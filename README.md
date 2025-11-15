# Vite Webflow Build System (Prod + Staging)

A modern and beginner-friendly workflow for building and deploying JavaScript and CSS assets for Webflow using Vite, GitHub Actions, and Bunny CDN.

This project includes:

- Fast Vite dev server
- Automatic builds for production and staging
- Full versioning system
- Rollback system
- CDN deployment via Bunny.net
- Auto-loader snippet for Webflow (Slater-style)
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

This project deploys your build output to Bunny Storage and serves it through a Pull Zone CDN.

### 4.1 Create a Storage Zone

Example:

- Storage Zone Name: myproject-storage
- Hostname: myproject-storage.b-cdn.net
- FTP Username: auto-generated
- FTP Password: shown once

### 4.2 Create a Pull Zone

Example:

- Pull Zone Name: myproject
- CDN URL: https://myproject.b-cdn.net/

This is the CDN URL used inside Webflow.

### 4.3 Create an API Key

Dashboard → API → Add API Key.

---

## 5. GitHub Secrets (Deployment)

Add these secrets:

- BUNNY_FTP_USERNAME
- BUNNY_FTP_PASSWORD
- BUNNY_STORAGE_ZONE
- BUNNY_PULLZONE_ID
- BUNNY_API_KEY

---

## 6. Project Structure

    dist/
      prod/
        latest/
        versions/
      staging/
        latest/
        versions/
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

### Dev mode:

    yarn dev

Runs at http://localhost:3000

### Build mode:

Vite outputs:

    app.js
    app.css
    assets/

These files are deployed to Bunny CDN.

---

## 8. Dual Build System — Prod + Staging

Two environments:

- staging (Webflow preview)
- prod (real domain)

### Build commands:

    yarn build staging patch
    yarn build prod patch

Version increments:

- patch
- minor
- major

Examples:

    yarn build prod minor
    yarn build staging major

Each build:

- bumps version
- builds with Vite
- writes to dist/{env}/latest
- archives version: dist/{env}/versions/vX.X.X
- updates dist/{env}/versions/versions.json

---

## 9. Restore a Version

    yarn restore prod 1.2.3
    yarn restore staging 1.2.3

Each environment has an independent archive.

---

## 10. Reset the Project

    yarn reset

Deletes dist/ and resets version to 0.0.1.

---

## 11. Using Your Scripts Inside Webflow (Local / Staging / Prod)

There are two ways to load scripts inside Webflow:

---

### A. Local development (hot reload)

When running:

    yarn dev

Insert these tags in Webflow → Page Settings → Before </body>:

    <!-- Local development -->
    <script type="module" src="https://localhost:3000/@vite/client"></script>
    <script type="module" src="https://localhost:3000/src/main.js"></script>

Benefits:

- Hot module reload
- Instant JS/CSS updates
- Real dev environment in Webflow
- No rebuild needed

⚠️ Works only on https and with CORS allowed.  
⚠️ Do not publish live with these scripts.

---

### B. Staging / Production (CDN loader snippet)

When deploying:

    yarn build staging patch
    yarn build prod patch

Generate the environment loader snippet:

    yarn snippet https://your-project.b-cdn.net

This generates:

    dist/snippet.html

Paste the MINIFIED snippet into Webflow (Before </body>).

This snippet automatically selects:

- staging on *.webflow.io
- prod on your real domain
- staging if URL contains ?env=staging

Example output:

    <script>document.addEventListener("DOMContentLoaded",function(){const C="https://your-project.b-cdn.net",p=new URLSearchParams(location.search),o=p.get("env");let e=o==="staging"?"staging":location.hostname.includes("webflow.io")?"staging":"prod";const u=`${C}/${e}/latest/app.js`,s=document.createElement("script");s.src=u,s.type="text/javascript",document.body.appendChild(s)});</script>

---

### Summary

| Environment | What you paste in Webflow | Use case |
|------------|----------------------------|----------|
| Local | Local Vite scripts | Development |
| Staging | Loader snippet | Webflow preview |
| Prod | Loader snippet | Real domain |

---

## 12. ESLint + Prettier

Lint:

    yarn lint

Fix:

    yarn lint:fix

Format:

    yarn format

Configs:

- .eslintrc.json
- .prettierrc

---

## 13. Typical Workflow

1. Install dependencies:

       yarn

2. Start dev:

       yarn dev

3. Build staging:

       yarn build staging patch

4. Push to GitHub → deploy to Bunny

5. Test on Webflow

6. Build production:

       yarn build prod patch

7. Publish Webflow

8. Rollback if needed:

       yarn restore prod 0.0.4

---

## 14. License

MIT License (recommended for starters and boilerplates).

---

## 15. You’re Ready

This workflow gives you:

- Vite-powered dev experience
- CDN deployment via Bunny
- Versioned dual builds
- Slater-style loader
- Webflow integration
- Linting and formatting

Perfect for high-performance, maintainable Webflow projects.
