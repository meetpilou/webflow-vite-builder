// scripts/bunny.js — Shared Bunny CDN upload + purge module — 2025
// -----------------------------------------------------------------
// Provides two core functions:
//   - uploadFile(localFile, remotePath) → uploads a single file
//   - purgeUrl(cdnUrl)                  → purges CDN cache for a URL
//
// CDN folder structure:
//   staging/app.js          ← no versioning, always overwritten
//   staging/app.css
//   prod/latest/app.js      ← versioned
//   prod/latest/app.css
//
// All credentials are read from environment variables (via .env).
// Never hardcode keys here.

import fs from 'fs-extra';
import path from 'path';

// ------------------------------------------------------------
// Read env — supports both process.env and .env file via dotenv
// ------------------------------------------------------------
function getEnv(key) {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing environment variable: ${key}\nCheck your .env file.`);
  }
  return val;
}

// ------------------------------------------------------------
// Upload a single file to Bunny Storage
//
// @param {string} localFile   — absolute path to the local file
// @param {string} remotePath  — remote path in storage zone (e.g. "staging/latest/app.js")
// ------------------------------------------------------------
export async function uploadFile(localFile, remotePath) {
  const storageName = getEnv('BUNNY_STORAGE_NAME');
  const storageKey = getEnv('BUNNY_STORAGE_KEY');
  const region = process.env.BUNNY_STORAGE_REGION || '';

  // Build the storage base URL based on region
  // Default (Falkenstein): storage.bunnycdn.com
  // Other regions: {region}.storage.bunnycdn.com
  const host = region ? `${region}.storage.bunnycdn.com` : 'storage.bunnycdn.com';
  const url = `https://${host}/${storageName}/${remotePath}`;

  const fileBuffer = await fs.readFile(localFile);
  const fileName = path.basename(localFile);

  // Determine content type
  const ext = path.extname(fileName).toLowerCase();
  const contentType =
    ext === '.css'
      ? 'text/css'
      : ext === '.js'
        ? 'application/javascript'
        : 'application/octet-stream';

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: storageKey,
      'Content-Type': contentType,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed for ${remotePath}: ${response.status} ${text}`);
  }

  return { file: remotePath, status: response.status };
}

// ------------------------------------------------------------
// Upload multiple files in parallel
//
// @param {Array<{local, remote}>} files — list of files to upload
// ------------------------------------------------------------
export async function uploadFiles(files) {
  return Promise.all(files.map(({ local, remote }) => uploadFile(local, remote)));
}

// ------------------------------------------------------------
// Purge a single CDN URL
//
// Uses the Bunny Account API key (not the storage key).
// @param {string} cdnUrl — full CDN URL to purge
// ------------------------------------------------------------
export async function purgeUrl(cdnUrl) {
  const apiKey = getEnv('BUNNY_API_KEY');

  const response = await fetch(
    `https://api.bunny.net/purge?url=${encodeURIComponent(cdnUrl)}&async=false`,
    {
      method: 'POST',
      headers: {
        AccessKey: apiKey,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Purge failed for ${cdnUrl}: ${response.status} ${text}`);
  }

  return { url: cdnUrl, status: response.status };
}

// ------------------------------------------------------------
// Purge multiple CDN URLs in parallel
//
// @param {string[]} urls — list of CDN URLs to purge
// ------------------------------------------------------------
export async function purgeUrls(urls) {
  return Promise.all(urls.map((url) => purgeUrl(url)));
}

// ------------------------------------------------------------
// Upload build for an environment + purge CDN cache
//
// Remote path structure:
//   staging → staging/app.js  (no /latest — no versioning)
//   prod    → prod/latest/app.js
//
// @param {string} env        — "staging" or "prod"
// @param {string} distDir    — local dist directory
// @param {string[]} files    — filenames to upload (e.g. ["app.js", "app.css"])
// ------------------------------------------------------------
export async function deployEnv(env, distDir, files = ['app.js', 'app.css']) {
  const cdnUrl = getEnv('BUNNY_CDN_URL').replace(/\/$/, '');

  // Staging has no /latest — files sit directly under staging/
  const remoteBase = env === 'staging' ? 'staging' : 'prod/latest';

  console.log(`\n📤 Uploading ${env} build to Bunny CDN...`);

  const uploads = files.map((file) => ({
    local: path.join(distDir, file),
    remote: `${remoteBase}/${file}`,
  }));

  await uploadFiles(uploads);

  console.log(`✅ Upload complete (${files.join(', ')})`);

  console.log(`🔄 Purging CDN cache...`);

  const urlsToPurge = files.map((file) => `${cdnUrl}/${remoteBase}/${file}`);
  await purgeUrls(urlsToPurge);

  console.log(`✨ Cache purged — ${env} is live!\n`);
}
