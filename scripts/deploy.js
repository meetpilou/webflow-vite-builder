// scripts/deploy.js — Manual deploy to Bunny CDN (staging or prod) — 2025
// -----------------------------------------------------------------------
// Uploads the current dist/[env]/latest build to Bunny CDN and purges cache.
// Does NOT rebuild — use this to push what's already built.
//
// Usage:
//   yarn deploy:staging     → upload dist/staging/latest to CDN
//   yarn deploy:prod        → upload dist/prod/latest to CDN

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { deployEnv } from './bunny.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ------------------------------------------------------------
// Load .env file manually
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
// MAIN
// ------------------------------------------------------------
async function deploy() {
  await loadEnv();

  const ENV = process.argv[2];

  if (!ENV || !['prod', 'staging'].includes(ENV)) {
    console.error('❌ Usage: yarn deploy [prod|staging]');
    process.exit(1);
  }

  const distDir = env === 'staging'
    ? path.join(DIST, 'staging')
    : path.join(DIST, 'prod', 'latest');

  // Check that a build exists
  const jsFile = path.join(distDir, 'app.js');
  const cssFile = path.join(distDir, 'app.css');

  if (!(await fs.pathExists(jsFile)) || !(await fs.pathExists(cssFile))) {
    console.error(`❌ No build found in dist/${ENV}/latest/`);
    console.error(`   Run a build first: yarn build:${ENV}`);
    process.exit(1);
  }

  console.log(`\n🚀 Manual deploy → ${ENV.toUpperCase()}`);

  // Also upload assets folder if it exists
  const assetsDir = path.join(distDir, 'assets');
  const hasAssets = await fs.pathExists(assetsDir);

  const filesToDeploy = ['app.js', 'app.css'];

  if (hasAssets) {
    // Collect all asset files recursively
    const assetFiles = await collectFiles(assetsDir, distDir);
    filesToDeploy.push(...assetFiles);
    console.log(`📁 Including ${assetFiles.length} asset file(s)`);
  }

  await deployEnv(ENV, distDir, filesToDeploy);
}

// ------------------------------------------------------------
// Recursively collect relative file paths from a directory
// ------------------------------------------------------------
async function collectFiles(dir, baseDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath, baseDir);
      files.push(...nested);
    } else {
      // Return path relative to distDir (e.g. "assets/images/logo.png")
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

deploy();
