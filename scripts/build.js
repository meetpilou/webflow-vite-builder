// scripts/build.js — Dual ENV Build System (Prod + Staging) — 2025
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');

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

async function build() {
  console.log('\n🚀 Starting build...\n');

  // ------------------------------
  // 1. Parse ENV
  // ------------------------------
  const ENV = process.argv[2];
  const increment = process.argv[3] || 'patch';

  if (!['prod', 'staging'].includes(ENV)) {
    console.error('❌ Usage: yarn build [prod|staging] [patch|minor|major]\n');
    process.exit(1);
  }

  if (!['patch', 'minor', 'major'].includes(increment)) {
    console.error('❌ Invalid increment. Use: patch | minor | major\n');
    process.exit(1);
  }

  // ------------------------------
  // 2. Prepare paths
  // ------------------------------
  const DIST = path.join(ROOT, 'dist');
  const ENV_ROOT = path.join(DIST, ENV);
  const LATEST = path.join(ENV_ROOT, 'latest');
  const VERSIONS = path.join(ENV_ROOT, 'versions');
  const VERSIONS_JSON = path.join(VERSIONS, 'versions.json');

  await fs.ensureDir(LATEST);
  await fs.ensureDir(VERSIONS);

  // ------------------------------
  // 3. Version bump
  // ------------------------------
  const pkg = JSON.parse(await fs.readFile(PKG));
  const nextVersion = semver.inc(pkg.version, increment);

  pkg.version = nextVersion;
  await fs.writeFile(PKG, JSON.stringify(pkg, null, 2));

  console.log(`📦 Version bumped → v${nextVersion} (${increment})`);
  console.log(`🌍 Environment → ${ENV}\n`);

  const buildStart = Date.now();

  // ------------------------------
  // 4. Build with Vite
  // ------------------------------
  console.log('🛠️ Building project with Vite...');
  process.env.VITE_BUILD_OUTDIR = LATEST;

  execSync('vite build', { stdio: 'inherit' });

  // ------------------------------
  // 5. Collect metadata
  // ------------------------------
  const jsFile = path.join(LATEST, 'app.js');
  const cssFile = path.join(LATEST, 'app.css');

  const jsSize = await fileSizeKB(jsFile);
  const cssSize = await fileSizeKB(cssFile);
  const totalSize = (parseFloat(jsSize) + parseFloat(cssSize)).toFixed(2);

  const jsChecksum = await checksum(jsFile);

  const meta = {
    date: new Date().toISOString(),
    commit: getGitCommit(),
    branch: getBranch(),
    env: ENV,
    nodeVersion: process.version,
    viteVersion: pkg.devDependencies?.vite || 'unknown',
    buildTimeMs: Date.now() - buildStart,
    files: {
      js: { path: '/app.js', sizeKB: jsSize, checksum: jsChecksum },
      css: { path: '/app.css', sizeKB: cssSize },
    },
    totalSizeKB: totalSize,
  };

  // ------------------------------
  // 6. Archive version
  // ------------------------------
  const versionDir = path.join(VERSIONS, `v${nextVersion}`);
  await fs.ensureDir(versionDir);
  await fs.copy(LATEST, versionDir);

  // ------------------------------
  // 7. Write version.json
  // ------------------------------
  let versions = { latest: nextVersion, versions: {} };

  if (await fs.pathExists(VERSIONS_JSON)) {
    versions = JSON.parse(await fs.readFile(VERSIONS_JSON));
  }

  versions.versions[nextVersion] = meta;
  versions.latest = nextVersion;

  await fs.writeFile(VERSIONS_JSON, JSON.stringify(versions, null, 2));

  // ------------------------------
  // 8. Done
  // ------------------------------
  console.log(`\n✨ Build finished for ${ENV}`);
  console.log(`📁 Version saved: v${nextVersion}`);
  console.log(`📂 Archive: dist/${ENV}/versions/v${nextVersion}/`);
  console.log(`📌 versions.json updated`);
  console.log(`⏱️ Build time: ${meta.buildTimeMs}ms\n`);
}

build();
