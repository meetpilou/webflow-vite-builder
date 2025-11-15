// scripts/reset.js — Reset all environments
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PKG = path.join(ROOT, 'package.json');

async function reset() {
  console.log('\n🧹 Resetting project...\n');

  await fs.remove(DIST);
  await fs.ensureDir(DIST);

  const pkg = JSON.parse(await fs.readFile(PKG));
  pkg.version = '0.0.1';
  await fs.writeFile(PKG, JSON.stringify(pkg, null, 2));

  console.log('📂 Clean dist/');
  console.log('📦 Version reset → 0.0.1');
  console.log('\n✨ Project reset complete!\n');
}

reset();
