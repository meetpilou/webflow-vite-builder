// scripts/watch.js — Vite watch + auto-deploy to Bunny CDN (staging) — 2025
// --------------------------------------------------------------------------
// Starts Vite in watch mode (non-minified, readable output).
// On every file change, Vite rebuilds and then automatically:
//   1. Uploads app.js + app.css to Bunny CDN → staging/latest/
//   2. Purges the CDN cache for those URLs
//
// The URL never changes — only the content is updated.
// A debounce prevents multiple rapid uploads on burst saves.
//
// Usage:
//   yarn dev

import { createServer, build } from 'vite';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { deployEnv } from './bunny.js';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_STAGING = path.join(ROOT, 'dist', 'staging');

// ------------------------------------------------------------
// Load .env manually (no extra dependency needed)
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
// Debounce helper
// ------------------------------------------------------------
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ------------------------------------------------------------
// Deploy staging after a build
// ------------------------------------------------------------
async function deployStagingBuild() {
  try {
    await deployEnv('staging', DIST_STAGING);
  } catch (err) {
    console.error('❌ Deploy error:', err.message);
  }
}

const debouncedDeploy = debounce(deployStagingBuild, 500);

// ------------------------------------------------------------
// MAIN — Start Vite in watch mode
// ------------------------------------------------------------
async function startWatch() {
  await loadEnv();

  console.log('\n👀 Starting Vite watch mode (staging)...');
  console.log('📦 Non-minified build → auto-deploy to Bunny CDN on every save\n');

  await fs.ensureDir(DIST_STAGING);

  // Vite build in watch mode
  // The watcher object lets us listen to rebuild events
  const watcher = await build({
    configFile: path.join(ROOT, 'vite.config.js'),
    mode: 'development',
    build: {
      watch: {},
      outDir: DIST_STAGING,
      emptyOutDir: true,
      minify: false,
      sourcemap: true,
    },
    // Override esbuild to disable minification in watch mode
    esbuild: {
      target: 'es2025',
      drop: [],
      minify: false,
    },
  });

  // Listen to Vite rollup watcher events
  watcher.on('event', (event) => {
    if (event.code === 'BUNDLE_END') {
      console.log(`\n🔨 Build complete — deploying to staging CDN...`);
      debouncedDeploy();
    }

    if (event.code === 'ERROR') {
      console.error('❌ Build error:', event.error.message);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Stopping watch mode...');
    await watcher.close();
    process.exit(0);
  });
}

startWatch();
