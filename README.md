# Vite Webflow Build System (Prod + Staging)

A modern and beginner-friendly workflow for building and deploying JavaScript and CSS assets for Webflow using **Vite**, **GitHub Actions**, and **Bunny CDN**.

This project includes:

- 🚀 Fast Vite dev server
- 🔥 Automatic builds for **production** and **staging**
- 🗂️ Full versioning system with archived history
- ⏪ Rollback support
- 🌐 CDN deployment via Bunny.net
- 🔧 Auto-loader snippet for Webflow (Slater-style)
- 🧹 Reset tools
- ✨ ESLint + Prettier configuration

---

## 1. Requirements

You need:

- macOS / Windows / Linux
- GitHub account
- Bunny.net account
- Node.js installed
- (Optional) a Webflow project

No previous experience with Node, npm, Yarn, or GitHub is required.

---

## 2. Install Node.js, npm, and Yarn

### 2.1 Install Node.js

Download the LTS version from:

    https://nodejs.org/

Then check installation in your terminal:

    node -v
    npm -v

You should see version numbers (for example: v22.x.x).

### 2.2 Install Yarn

Install Yarn globally:

    npm install --global yarn

Check installation:

    yarn -v

---

## 3. Clone the Repository and Install Dependencies

Clone your project and install all dependencies:

    git clone https://github.com/your-username/your-project.git
    cd your-project
    yarn

---

## 4. Setting Up Bunny CDN

This project deploys your build output to **Bunny Storage** and serves it via a **Pull Zone CDN**.

### 4.1 Create a Storage Zone

In Bunny:

1. Go to “Storage Zones”.
2. Create a new Storage Zone.

Example:

- Storage Zone Name: `myproject-storage`
- Hostname: `myproject-storage.b-cdn.net`
- FTP Username: auto-generated
- FTP Password: shown once

You will need the FTP credentials for deployment from GitHub.

### 4.2 Create a Pull Zone

Create a Pull Zone that points to your Storage Zone.

Example:

- Pull Zone Name: `myproject`
- CDN URL: `https://myproject.b-cdn.net/`

This **CDN URL** will be used in the Webflow snippet and in your deployment logic.

### 4.3 Create an API Key

In Bunny:

- Go to “API”
- Create a new API key
- Restrict it to what you need (purge cache, manage zones, etc.)

You will use this key as a GitHub secret.

---

## 5. GitHub Secrets (Deployment Configuration)

In your GitHub repo:

1. Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

- `BUNNY_FTP_USERNAME` → FTP username of your Storage Zone
- `BUNNY_FTP_PASSWORD` → FTP password
- `BUNNY_STORAGE_ZONE` → Storage Zone name (e.g. `myproject-storage`)
- `BUNNY_PULLZONE_ID` → Numeric ID of your Pull Zone
- `BUNNY_API_KEY` → Your Bunny API key

These allow your GitHub Actions workflow to:

- Upload build files to Bunny Storage
- Purge cache for the Pull Zone

---

## 6. Project Structure

Your project files are organized like this:

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

### 6.1 Important folders

- `src/` → All your source code (JavaScript, CSS, modules…).
- `public/` → Static files that are copied as-is into the final build (images, fonts, etc.).
- `dist/` → Generated builds for **prod** and **staging**, plus the generated Webflow snippet.
- `scripts/` → Helper scripts for build, versioning, restore, reset, snippet generation.

---

## 7. What Is Vite? (Beginner-Friendly)

**Vite** is a modern tool for building front-end projects. It gives you:

- A very fast local dev server
- Automatic bundling of JavaScript, CSS, and assets
- Production-ready builds

### 7.1 Dev server

To start a local dev server:

    yarn dev

Then open:

    http://localhost:3000

Whenever you change a file in `src/`, the page reloads almost instantly.

### 7.2 Build system

When you run a build command, Vite:

- Reads your entry file `src/main.js`
- Bundles all imported modules
- Extracts CSS
- Outputs:

  app.js
  app.css
  assets/...

This output is what you deploy to Bunny CDN.

---

## 8. Dual Build System — Prod + Staging

This project supports two separate environments:

- `prod` → your real website domain (production)
- `staging` → your Webflow subdomain or test environment

Each environment has its **own builds, its own history, and its own versions.json**.

---

### 8.1 Build Commands

There are two main build commands in this system:

    yarn build prod patch
    yarn build staging patch

The last argument (`patch`, `minor`, or `major`) controls how the semantic version is incremented.

- `patch` → small changes, bug fixes
- `minor` → new features that don’t break things
- `major` → big breaking changes

Examples:

    yarn build prod patch
    yarn build prod minor
    yarn build staging major

Each build:

- Increments the version in `package.json`
- Builds the project with Vite
- Writes the output to either:

  dist/prod/latest
  dist/staging/latest

- Archives a copy in:

  dist/prod/versions/vX.X.X
  dist/staging/versions/vX.X.X

- Updates `versions.json` with metadata (date, commit hash, sizes, checksum, etc.)

---

### 8.2 Folder Structure for Builds

After several builds, you might see:

    dist/
      prod/
        latest/
        versions/
          v1.2.3/
        versions.json

      staging/
        latest/
        versions/
          v1.2.3/
        versions.json

- `latest/` → The currently active version for that environment
- `versions/` → All archived versions
- `versions.json` → History of builds (metadata)

---

### 8.3 Restore a Version

You can easily rollback to a previous build.

Restore a **prod** version:

    yarn restore prod 1.2.3

Restore a **staging** version:

    yarn restore staging 1.2.3

This copies the archived version (for example `dist/prod/versions/v1.2.3`) into `dist/prod/latest`.

---

### 8.4 Notes

- Each environment has its own version history and archive.
- `versions.json` contains metadata such as:
  - date
  - commit
  - branch
  - Node version
  - Vite version
  - JS / CSS sizes
  - checksum
  - build time

- The active version is always inside:

  dist/{env}/latest

---

## 9. Reset the Project

If you want to wipe all build artifacts and reset the project version:

    yarn reset

This:

- Deletes the `dist/` folder
- Resets `package.json` version to `0.0.1`

Useful when starting from scratch or cleaning up.

---

## 10. Webflow Integration (Snippet Loader)

To connect your Bunny CDN output with Webflow, you use a small “loader” snippet that decides which environment to load.

### 10.1 Generate the Webflow snippet

Run:

    yarn snippet https://YOUR-PROJECT.b-cdn.net

Replace `https://YOUR-PROJECT.b-cdn.net` with your actual Bunny Pull Zone URL.

This command generates:

    dist/snippet.html

Open this file and copy the **minified snippet**.

### 10.2 Add the snippet to Webflow

In Webflow:

1. Go to **Project Settings → Custom Code**
2. Paste the snippet into the **Before </body>** section
3. Publish the site

The snippet loads either the **prod** or **staging** app.js from Bunny, based on the domain.

### 10.3 Environment selection logic

The loader script typically behaves like this:

- On `*.webflow.io` → it loads the **staging** environment
- On your real domain → it loads the **prod** environment
- If the URL contains `?env=staging` → it forces staging

This allows you to:

- Test new features on Webflow staging
- Keep production stable on the real domain
- Manually switch environment with a query parameter if needed

---

## 11. ESLint + Prettier

This project includes an ESLint + Prettier setup for clean, consistent JavaScript.

### 11.1 Lint your code

Check for problems:

    yarn lint

Fix automatically:

    yarn lint:fix

### 11.2 Format your code

Format all supported files:

    yarn format

Configuration lives in:

- `.eslintrc.json`
- `.prettierrc`

These are set up for modern JavaScript (ES2025), using rules like:

- `no-unused-vars`
- `prefer-const`
- `no-var`
- `prettier/prettier`

---

## 12. Typical Workflow (Step-by-Step)

1.  **Install dependencies** (first time):

    yarn

2.  **Start local development**:

        yarn dev

    Open `http://localhost:3000` and work in `src/`.

3.  **Build staging** when you want to test on Webflow:

    yarn build staging patch

4.  **Push to GitHub**.  
    Your GitHub Action (if configured) will:
    - Build the project
    - Upload the output to Bunny Storage
    - Purge Bunny CDN cache

5.  **Test on Webflow** (your `.webflow.io` subdomain).

6.  **Build production** when you are confident:

    yarn build prod patch

7.  **Publish on Webflow** with your real domain.

8.  **Rollback if needed**:

    yarn restore prod 0.0.4

---

## 13. You’re Ready

You now have a complete, modern workflow:

- Vite for fast dev and optimized builds
- Dual environments: **staging** and **production**
- Semantic versioning and build history
- Automatic deployment to Bunny CDN
- Webflow integration with a flexible loader snippet
- Linting and formatting already set up

This starter is designed so that even beginners can gradually learn:

- How a build system works
- How CDNs serve static assets
- How staging vs production fits into a workflow

Happy building!
