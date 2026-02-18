// scripts/build.js — Production Build with Intelligent Versioning — 2025
// -----------------------------------------------------------------------
// Builds, versions and archives the prod output, then deploys to Bunny CDN.
// Staging is NOT versioned — use yarn dev for staging (auto-deploy on save).
//
// Usage:
//   yarn build          → prod build, bump patch (0.0.1 → 0.0.2)
//   yarn build:minor    → prod build, bump minor (0.0.1 → 0.1.0)
//   yarn build:major    → prod build, bump major (0.0.1 → 1.0.0)
//
// Versioning logic:
//   Case A — staging build exists and is ahead of prod → prod adopts staging version
//   Case B — staging == prod (or no staging) → prod bumps version and rebuilds
//
// Only app.js + app.css are archived. Assets stay in /latest only.

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { deployEnv } from './bunny.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const DIST = path.join(ROOT, 'dist');

// ------------------------------------------------------------
// Load .env file
// ------------------------------------------------------------
async function loadEnv() {
  const envFile = path.join(ROOT, '.env');
  if (!(await fs.pathExists(envFile))) {
    console.error('❌ .env file not found. Copy .env.example and fill in your credentials.');
    process.exit(1);
  }

  const content = await fs.readFile(envFile, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
  } catch {
    return 'local';
  }
}

function getBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
  } catch {
    return 'unknown';
  }
}

async function checksum(file) {
  const data = await fs.readFile(file);
  return crypto.createHash('sha1').update(data).digest('hex');
}

async function fileSizeKB(file) {
  const stats = await fs.stat(file);
  return (stats.size / 1024).toFixed(2);
}

// ------------------------------------------------------------
// Load latest prod version from versions.json
// ------------------------------------------------------------
async function loadLatestProdVersion() {
  const versionsFile = path.join(DIST, 'prod', 'versions', 'versions.json');
  if (!(await fs.pathExists(versionsFile))) return null;
  const data = JSON.parse(await fs.readFile(versionsFile));
  return data.latest || null;
}

// ------------------------------------------------------------
// Read current staging version from dist/staging if it exists
// Staging has no versions.json — we read app.js mtime as a proxy
// and use package.json version as the reference point.
// ------------------------------------------------------------
async function stagingExists() {
  const jsFile = path.join(DIST, 'staging', 'app.js');
  return fs.pathExists(jsFile);
}

// ------------------------------------------------------------
// Generate version metadata for prod archive
// ------------------------------------------------------------
async function generateMeta(version, prodLatest) {
  const jsFile = path.join(prodLatest, 'app.js');
  const cssFile = path.join(prodLatest, 'app.css');

  return {
    version,
    env: 'prod',
    date: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getBranch(),
    nodeVersion: process.version,
    js: {
      sizeKB: await fileSizeKB(jsFile),
      checksum: await checksum(jsFile),
    },
    css: {
      sizeKB: await fileSizeKB(cssFile),
    },
  };
}

// ------------------------------------------------------------
// Archive prod version — ONLY app.js + app.css
// ------------------------------------------------------------
async function archiveProdVersion(version, prodLatest) {
  const VERSIONS = path.join(DIST, 'prod', 'versions');
  const VERSIONS_JSON = path.join(VERSIONS, 'versions.json');

  await fs.ensureDir(VERSIONS);

  const versionDir = path.join(VERSIONS, `v${version}`);
  await fs.ensureDir(versionDir);

  for (const file of ['app.js', 'app.css']) {
    const src = path.join(prodLatest, file);
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(versionDir, file));
    }
  }

  let versions = { latest: version, versions: {} };
  if (await fs.pathExists(VERSIONS_JSON)) {
    versions = JSON.parse(await fs.readFile(VERSIONS_JSON));
  }

  versions.latest = version;
  versions.versions[version] = await generateMeta(version, prodLatest);

  await fs.writeFile(VERSIONS_JSON, JSON.stringify(versions, null, 2));
}

// ------------------------------------------------------------
// MAIN BUILD LOGIC — prod only
// ------------------------------------------------------------
async function build() {
  console.log('\n🚀 Starting production build...\n');

  await loadEnv();

  const increment = process.argv[2] || 'patch';

  if (!['patch', 'minor', 'major'].includes(increment)) {
    console.error('❌ Invalid increment. Use: yarn build | yarn build:minor | yarn build:major');
    process.exit(1);
  }

  await fs.ensureDir(DIST);

  const PROD_LATEST = path.join(DIST, 'prod', 'latest');
  const STAGING_DIR = path.join(DIST, 'staging');

  await fs.ensureDir(PROD_LATEST);

  const pkg = JSON.parse(await fs.readFile(PKG_PATH));
  const currentVersion = pkg.version;
  const prodVersion = await loadLatestProdVersion();
  const hasStagingBuild = await stagingExists();

  let nextVersion;

  // ------------------------------------------------------------
  // Case A — A staging build exists → prod adopts it directly
  // No rebuild needed, we copy staging files to prod.
  // ------------------------------------------------------------
  if (hasStagingBuild) {
    // Prod bumps from its own last version, or from package.json
    const baseVersion = prodVersion || currentVersion;
    nextVersion = semver.inc(baseVersion, increment);

    // If prod had a previous version and staging already matches, just adopt
    // Otherwise bump normally
    console.log(`📌 Staging build found → Prod adopts staging files → v${nextVersion}`);

    await fs.copy(STAGING_DIR, PROD_LATEST);

    pkg.version = nextVersion;
    await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));

    await archiveProdVersion(nextVersion, PROD_LATEST);
    await deployEnv('prod', PROD_LATEST);

    console.log(`\n✅ Production build complete → v${nextVersion}\n`);
    return;
  }

  // ------------------------------------------------------------
  // Case B — No staging build → rebuild from source for prod
  // ------------------------------------------------------------
  nextVersion = semver.inc(prodVersion || currentVersion, increment);

  console.log(`🔨 No staging build found → Building prod from source → v${nextVersion}`);

  pkg.version = nextVersion;
  await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));

  process.env.VITE_BUILD_OUTDIR = PROD_LATEST;
  execSync('vite build', { stdio: 'inherit', cwd: ROOT });

  await archiveProdVersion(nextVersion, PROD_LATEST);
  await deployEnv('prod', PROD_LATEST);

  console.log(`\n✨ Production build complete → v${nextVersion}\n`);
}

build();
