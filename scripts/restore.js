// scripts/restore.js — Restore version for Prod or Staging — 2025
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

  if (!ENV || !version || !['prod', 'staging'].includes(ENV)) {
    console.error('❌ Usage: yarn restore [prod|staging] 1.2.3\n');
    process.exit(1);
  }

  const ENV_ROOT = path.join(DIST, ENV);
  const VERSIONS = path.join(ENV_ROOT, 'versions');
  const LATEST = path.join(ENV_ROOT, 'latest');
  const versionDir = path.join(VERSIONS, `v${version}`);

  // -----------------------------------------------------
  // 1. Check version exists
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // 2. Restore the version in the target environment
  // -----------------------------------------------------
  await fs.emptyDir(LATEST);
  await fs.copy(versionDir, LATEST);

  console.log(`✅ Restored v${version} → dist/${ENV}/latest`);

  // -----------------------------------------------------
  // 3. Update versions.json.latest pointer
  // -----------------------------------------------------
  const versionsFile = path.join(VERSIONS, 'versions.json');
  if (await fs.pathExists(versionsFile)) {
    const data = JSON.parse(await fs.readFile(versionsFile));
    data.latest = version;
    await fs.writeFile(versionsFile, JSON.stringify(data, null, 2));
  }

  // -----------------------------------------------------
  // 4. Staging/Prod sync rules
  // -----------------------------------------------------
  if (ENV === 'prod') {
    console.log('🔁 Syncing STAGING to the restored PROD version...');
    const stagingLatest = path.join(DIST, 'staging', 'latest');
    const stagingVersions = path.join(DIST, 'staging', 'versions');

    await fs.ensureDir(stagingLatest);
    await fs.ensureDir(stagingVersions);

    // Restore into staging/latest
    await fs.emptyDir(stagingLatest);
    await fs.copy(versionDir, stagingLatest);

    // Copy archive folder vX.X.X to staging/versions
    await fs.ensureDir(path.join(stagingVersions, `v${version}`));
    await fs.copy(versionDir, path.join(stagingVersions, `v${version}`));

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
