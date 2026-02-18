// scripts/restore.js — Restore a prod version — 2025
// ----------------------------------------------------
// Restores app.js + app.css from a prod version archive
// back into dist/prod/latest/.
//
// Staging has no versioning — it cannot be restored.
//
// Usage:
//   yarn restore prod 1.2.3

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

async function restore() {
  console.log('\n⏪ Restoring a previous prod version...\n');

  const ENV = process.argv[2];
  const version = process.argv[3];

  // ------------------------------------------------------------------
  // Validate input
  // ------------------------------------------------------------------
  if (!ENV || !version) {
    console.error('❌ Usage: yarn restore prod 1.2.3\n');
    process.exit(1);
  }

  if (ENV === 'staging') {
    console.error('❌ Staging has no versioning — nothing to restore.');
    console.error('   Use yarn dev or yarn build:staging to rebuild staging.\n');
    process.exit(1);
  }

  if (ENV !== 'prod') {
    console.error('❌ Usage: yarn restore prod 1.2.3\n');
    process.exit(1);
  }

  const PROD_ROOT = path.join(DIST, 'prod');
  const VERSIONS = path.join(PROD_ROOT, 'versions');
  const LATEST = path.join(PROD_ROOT, 'latest');
  const versionDir = path.join(VERSIONS, `v${version}`);

  // ------------------------------------------------------------------
  // 1. Check version exists
  // ------------------------------------------------------------------
  if (!(await fs.pathExists(versionDir))) {
    console.error(`❌ Version v${version} not found in prod archives`);

    const list = (await fs.readdir(VERSIONS).catch(() => [])).filter((f) => f.startsWith('v'));
    if (list.length === 0) {
      console.log('⚠️  No versions available.');
    } else {
      console.log('📜 Available prod versions:');
      list.forEach((v) => console.log('   •', v.replace('v', '')));
    }

    process.exit(1);
  }

  // ------------------------------------------------------------------
  // 2. Restore app.js + app.css into dist/prod/latest/
  // ------------------------------------------------------------------
  await fs.ensureDir(LATEST);

  const filesToCopy = ['app.js', 'app.css'];

  for (const file of filesToCopy) {
    const src = path.join(versionDir, file);
    const dest = path.join(LATEST, file);
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
    }
  }

  console.log(`✅ Restored v${version} → dist/prod/latest`);

  // ------------------------------------------------------------------
  // 3. Update versions.json latest pointer
  // ------------------------------------------------------------------
  const versionsFile = path.join(VERSIONS, 'versions.json');
  if (await fs.pathExists(versionsFile)) {
    const data = JSON.parse(await fs.readFile(versionsFile));
    data.latest = version;
    await fs.writeFile(versionsFile, JSON.stringify(data, null, 2));
  }

  console.log('\n✨ Restore complete.');
  console.log('   Run yarn deploy:prod to push to Bunny CDN.\n');
}

restore();
