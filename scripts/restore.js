// scripts/restore.js — Restore version for Prod or Staging — 2025
// ----------------------------------------------------------------
//
// NEW RULE (2025):
//   - Versions contain only app.js and app.css.
//   - Assets are NOT stored in each version, they remain only in
//     dist/[env]/latest/assets.
//
// This means restoring a version simply replaces latest/app.js and latest/app.css.
// Assets remain untouched since they are shared for all versions in that environment.

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

async function restore() {
  console.log('\n⏪ Restoring a previous version...\n');

  const ENV = process.argv[2];
  const version = process.argv[3];

  // ------------------------------------------------------------------
  // Validate input
  // ------------------------------------------------------------------
  if (!ENV || !version || !['prod', 'staging'].includes(ENV)) {
    console.error('❌ Usage: yarn restore [prod|staging] 1.2.3\n');
    process.exit(1);
  }

  const ENV_ROOT = path.join(DIST, ENV);
  const VERSIONS = path.join(ENV_ROOT, 'versions');
  const LATEST = path.join(ENV_ROOT, 'latest');
  const versionDir = path.join(VERSIONS, `v${version}`);

  // ------------------------------------------------------------------
  // 1. Check version exists
  // ------------------------------------------------------------------
  if (!(await fs.pathExists(versionDir))) {
    console.error(`❌ Version v${version} not found in ${ENV.toUpperCase()}`);

    const list = await fs.readdir(VERSIONS).catch(() => []);
    if (list.length === 0) {
      console.log('⚠️ No versions available.');
    } else {
      console.log('📜 Available versions in this environment:');
      list.forEach((v) => console.log('   •', v.replace('v', '')));
    }

    process.exit(1);
  }

  // ------------------------------------------------------------------
  // 2. Restore only versioned files (JS + CSS)
  // ------------------------------------------------------------------
  //
  // IMPORTANT: We DO NOT touch the assets folder.
  // Assets live permanently under dist/[env]/latest/assets.
  //
  await fs.ensureDir(LATEST);

  // Restore only app.js + app.css
  const filesToCopy = ['app.js', 'app.css'];

  for (const file of filesToCopy) {
    const src = path.join(versionDir, file);
    const dest = path.join(LATEST, file);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
    }
  }

  console.log(`✅ Restored v${version} → dist/${ENV}/latest`);

  // ------------------------------------------------------------------
  // 3. Update versions.json.latest pointer
  // ------------------------------------------------------------------
  const versionsFile = path.join(VERSIONS, 'versions.json');
  if (await fs.pathExists(versionsFile)) {
    const data = JSON.parse(await fs.readFile(versionsFile));
    data.latest = version;
    await fs.writeFile(versionsFile, JSON.stringify(data, null, 2));
  }

  // ------------------------------------------------------------------
  // 4. STAGING/PROD sync rules
  // ------------------------------------------------------------------
  if (ENV === 'prod') {
    console.log('🔁 Syncing STAGING to the restored PROD version...');

    const stagingLatest = path.join(DIST, 'staging', 'latest');
    const stagingVersions = path.join(DIST, 'staging', 'versions');
    const stagingVersionDir = path.join(stagingVersions, `v${version}`);

    await fs.ensureDir(stagingLatest);
    await fs.ensureDir(stagingVersions);
    await fs.ensureDir(stagingVersionDir);

    // Replace staging latest JS/CSS (assets remain untouched)
    for (const file of filesToCopy) {
      const src = path.join(versionDir, file);
      const dest = path.join(stagingLatest, file);
      if (await fs.pathExists(src)) {
        await fs.copy(src, dest);
      }
    }

    // Duplicate version into staging/versions
    for (const file of filesToCopy) {
      const src = path.join(versionDir, file);
      const dest = path.join(stagingVersionDir, file);
      if (await fs.pathExists(src)) {
        await fs.copy(src, dest);
      }
    }

    // Update staging versions.json
    const stagingVersionsFile = path.join(stagingVersions, 'versions.json');
    if (await fs.pathExists(stagingVersionsFile)) {
      const sdata = JSON.parse(await fs.readFile(stagingVersionsFile));
      sdata.latest = version;
      await fs.writeFile(stagingVersionsFile, JSON.stringify(sdata, null, 2));
    }

    console.log(`🟦 STAGING synced to v${version}`);
  }

  console.log('\n✨ Restore complete.\n');
}

restore();
