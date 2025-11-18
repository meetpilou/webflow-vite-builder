// scripts/reset.js — Full reset of Prod & Staging environments — 2025
// ------------------------------------------------------------------
// This script wipes the entire dist/ folder, resets package.json version
// and recreates a fresh empty environment structure, including versions.json
// files for both "prod" and "staging".
//
// After running: yarn reset --yes
// You can immediately rebuild with:
//   yarn build staging
//   yarn build prod

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
  // 4. Recreate empty dist structure for prod + staging
  // --------------------------------------------------------------------
  const envs = ['prod', 'staging'];

  for (const env of envs) {
    await fs.ensureDir(path.join(DIST, env, 'latest'));
    await fs.ensureDir(path.join(DIST, env, 'versions'));

    const versionsFile = path.join(DIST, env, 'versions', 'versions.json');

    await fs.writeFile(versionsFile, JSON.stringify({ latest: null, versions: {} }, null, 2));
  }

  // --------------------------------------------------------------------
  // 5. Done
  // --------------------------------------------------------------------
  console.log('📁 Fresh dist/ structure recreated.');
  console.log('\n✨ RESET COMPLETE — Project is clean.\n');
  console.log('Next step: run a staging or prod build.');
}

reset();
