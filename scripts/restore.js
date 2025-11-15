// scripts/restore.js — Restore previous version per environment
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

async function restore() {
  const ENV = process.argv[2];
  const version = process.argv[3];

  console.log('\n⏪ Restoring version...\n');

  if (!ENV || !version) {
    console.error('❌ Usage: yarn restore [prod|staging] 1.2.3\n');
    process.exit(1);
  }

  const ENV_ROOT = path.join(DIST, ENV);
  const VERSIONS = path.join(ENV_ROOT, 'versions');
  const LATEST = path.join(ENV_ROOT, 'latest');

  const versionDir = path.join(VERSIONS, `v${version}`);

  if (!(await fs.pathExists(versionDir))) {
    console.error(`❌ Version v${version} not found for ${ENV}`);
    const list = await fs.readdir(VERSIONS).catch(() => []);
    console.log('📜 Available:');
    list.forEach((v) => console.log('  •', v));
    process.exit(1);
  }

  await fs.emptyDir(LATEST);
  await fs.copy(versionDir, LATEST);

  console.log(`\n✅ Restored v${version} for ${ENV}`);
  console.log(`📂 dist/${ENV}/latest updated\n`);
}

restore();
