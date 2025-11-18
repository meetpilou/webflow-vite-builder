// scripts/build.js — Dual Environment Intelligent Versioning (Prod + Staging) — 2025
// ----------------------------------------------------------------------------------
// This script builds, versions and archives the output for two environments:
// "staging" and "prod".
//
// NEW RULE (2025):
//   - Only JS and CSS files are versioned.
//   - The /assets folder is stored ONCE per environment, inside /latest.
//   - Versions contain ONLY app.js + app.css (lightweight, no duplication).
//
// This improves storage usage dramatically and makes restores instant.

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const DIST = path.join(ROOT, 'dist');

// ------------------------------------------------------------
// Helpers: Git info, checksums, sizes
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
// Load last version pointer for an env from versions.json
// ------------------------------------------------------------
async function loadLatestVersion(env) {
  const versionsFile = path.join(DIST, env, 'versions', 'versions.json');
  if (!(await fs.pathExists(versionsFile))) return null;

  const data = JSON.parse(await fs.readFile(versionsFile));
  return data.latest || null;
}

// ------------------------------------------------------------
// Generate version metadata (size, checksum, git info, date...)
// ------------------------------------------------------------
async function generateMeta(env, version) {
  const ENV_ROOT = path.join(DIST, env, 'latest');
  const jsFile = path.join(ENV_ROOT, 'app.js');
  const cssFile = path.join(ENV_ROOT, 'app.css');

  const jsSize = await fileSizeKB(jsFile);
  const cssSize = await fileSizeKB(cssFile);

  return {
    version,
    env,
    date: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getBranch(),
    nodeVersion: process.version,
    js: {
      sizeKB: jsSize,
      checksum: await checksum(jsFile),
    },
    css: {
      sizeKB: cssSize,
    },
  };
}

// ------------------------------------------------------------
// Archive version — ONLY app.js + app.css (NO ASSETS)
// ------------------------------------------------------------
//
// IMPORTANT: We do NOT copy assets into version archives.
// Assets live once under /latest/assets for each environment.
//
// This avoids heavy duplication and keeps versions extremely light.
//
async function archiveVersion(env, version) {
  const ENV_ROOT = path.join(DIST, env);
  const LATEST = path.join(ENV_ROOT, 'latest');
  const VERSIONS = path.join(ENV_ROOT, 'versions');
  const VERSIONS_JSON = path.join(VERSIONS, 'versions.json');

  await fs.ensureDir(VERSIONS);

  const versionDir = path.join(VERSIONS, `v${version}`);
  await fs.ensureDir(versionDir);

  // Only copy versionable files — app.js + app.css
  const filesToCopy = ['app.js', 'app.css'];

  for (const file of filesToCopy) {
    const src = path.join(LATEST, file);
    const dest = path.join(versionDir, file);
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
    }
  }

  // Update versions.json
  let versions = { latest: version, versions: {} };
  if (await fs.pathExists(VERSIONS_JSON)) {
    versions = JSON.parse(await fs.readFile(VERSIONS_JSON));
  }

  versions.latest = version;
  versions.versions[version] = await generateMeta(env, version);

  await fs.writeFile(VERSIONS_JSON, JSON.stringify(versions, null, 2));
}

// ------------------------------------------------------------
// MAIN BUILD LOGIC
// ------------------------------------------------------------
async function build() {
  console.log('\n🚀 Starting build...\n');

  const ENV = process.argv[2];
  const increment = process.argv[3] || 'patch';

  if (!['prod', 'staging'].includes(ENV)) {
    console.error('❌ Usage: yarn build [prod|staging] [patch|minor|major]');
    process.exit(1);
  }

  if (!['patch', 'minor', 'major'].includes(increment)) {
    console.error('❌ Invalid increment: patch | minor | major');
    process.exit(1);
  }

  await fs.ensureDir(DIST);
  const ENV_ROOT = path.join(DIST, ENV);
  const LATEST = path.join(ENV_ROOT, 'latest');

  // Ensure environment directories exist
  await fs.ensureDir(LATEST);

  // Load package.json
  const pkg = JSON.parse(await fs.readFile(PKG_PATH));
  let currentVersion = pkg.version;

  // Load latest versions for staging and prod
  const stagingVersion = await loadLatestVersion('staging');
  const prodVersion = await loadLatestVersion('prod');

  let nextVersion;

  // ------------------------------------------------------------
  // 🔵 STAGING BUILD
  // ------------------------------------------------------------
  if (ENV === 'staging') {
    nextVersion = semver.inc(currentVersion, increment);
    pkg.version = nextVersion;

    console.log(`📦 Staging build → bump to v${nextVersion}`);

    await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));

    // Build Vite into dist/staging/latest
    process.env.VITE_BUILD_OUTDIR = LATEST;
    execSync('vite build', { stdio: 'inherit' });

    await archiveVersion('staging', nextVersion);

    console.log(`\n✨ Staging build complete → v${nextVersion}\n`);
    return;
  }

  // ------------------------------------------------------------
  // 🔴 PROD BUILD LOGIC
  // ------------------------------------------------------------
  console.log('🟥 Production build logic');

  const lastStaging = stagingVersion || currentVersion;
  const lastProd = prodVersion || currentVersion;

  // CASE A — Staging is ahead → Prod adopts staging version
  if (stagingVersion && semver.gt(stagingVersion, lastProd)) {
    nextVersion = stagingVersion;

    console.log(`📌 Staging ahead → Prod adopts v${nextVersion}`);

    const src = path.join(DIST, 'staging', 'latest');
    await fs.copy(src, LATEST);

    pkg.version = nextVersion;
    await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));

    await archiveVersion('prod', nextVersion);

    console.log(`\n✅ Production synced to staging version v${nextVersion}\n`);
    return;
  }

  // CASE B — staging == prod → bump version
  if (semver.eq(lastStaging, lastProd)) {
    nextVersion = semver.inc(currentVersion, increment);

    console.log(`🔧 Prod bump (staging==prod) → next version = v${nextVersion}`);

    pkg.version = nextVersion;
    await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));

    process.env.VITE_BUILD_OUTDIR = LATEST;
    execSync('vite build', { stdio: 'inherit' });

    await archiveVersion('prod', nextVersion);

    // Sync staging with the new prod version
    const stagingLatest = path.join(DIST, 'staging', 'latest');
    await fs.copy(LATEST, stagingLatest);
    await archiveVersion('staging', nextVersion);

    console.log(`\n✨ Prod build complete → v${nextVersion} (staging synced)\n`);
    return;
  }

  // CASE C — First prod build
  nextVersion = semver.inc(currentVersion, increment);
  console.log(`🔨 First prod build → bump to v${nextVersion}`);

  pkg.version = nextVersion;
  await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));

  process.env.VITE_BUILD_OUTDIR = LATEST;
  execSync('vite build', { stdio: 'inherit' });

  await archiveVersion('prod', nextVersion);

  // Shadow sync staging
  const stagingLatest = path.join(DIST, 'staging', 'latest');
  await fs.copy(LATEST, stagingLatest);
  await archiveVersion('staging', nextVersion);

  console.log(`\n✨ First production build → v${nextVersion}\n`);
}

build();
