// scripts/reset.js — Full reset of Prod & Staging environments — 2025
// ------------------------------------------------------------------
// Wipes the entire dist/ folder, resets package.json version to 0.0.1
// and recreates a fresh empty environment structure.
//
// Staging structure: dist/staging/  (no versioning, no /latest)
// Prod structure:    dist/prod/latest/ + dist/prod/versions/
//
// Usage: yarn reset --yes

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const DIST = path.join(ROOT, 'dist');

async function reset() {
  console.log('\n🧨 Full project RESET\n');

  // --------------------------------------------------------------------
  // 1. Interactive safeguard — requires "--yes"
  // --------------------------------------------------------------------
  if (!process.argv.includes('--yes')) {
    console.log('⚠️  This will ERASE all builds, versions, archives.');
    console.log('    Use: yarn reset --yes\n');
    process.exit(1);
  }

  // --------------------------------------------------------------------
  // 2. Delete dist/
  // --------------------------------------------------------------------
  if (await fs.pathExists(DIST)) {
    await fs.remove(DIST);
    console.log('🗑️  Deleted dist/ folder.');
  } else {
    console.log('ℹ️  dist/ folder already removed.');
  }

  // --------------------------------------------------------------------
  // 3. Reset package.json version → 0.0.1
  // --------------------------------------------------------------------
  try {
    const pkg = JSON.parse(await fs.readFile(PKG_PATH));
    pkg.version = '0.0.1';
    await fs.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2));
    console.log('📦 package.json version reset → 0.0.1');
  } catch (e) {
    console.error('❌ Could not update package.json');
    console.error(e);
    process.exit(1);
  }

  // --------------------------------------------------------------------
  // 4. Recreate empty dist structure
  //
  //   dist/staging/              ← no versioning, files sit here directly
  //   dist/prod/latest/          ← versioned prod builds
  //   dist/prod/versions/        ← prod archives
  // --------------------------------------------------------------------
  await fs.ensureDir(path.join(DIST, 'staging'));
  await fs.ensureDir(path.join(DIST, 'prod', 'latest'));
  await fs.ensureDir(path.join(DIST, 'prod', 'versions'));

  const prodVersionsFile = path.join(DIST, 'prod', 'versions', 'versions.json');
  await fs.writeFile(prodVersionsFile, JSON.stringify({ latest: null, versions: {} }, null, 2));

  // --------------------------------------------------------------------
  // 5. Done
  // --------------------------------------------------------------------
  console.log('📁 Fresh dist/ structure recreated.');
  console.log('\n✨ RESET COMPLETE — Project is clean.\n');
  console.log('Next step: run yarn dev or yarn build:prod.');
}

reset();
