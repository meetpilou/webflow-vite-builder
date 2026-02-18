// scripts/setup.js — Interactive project setup — 2025
// -----------------------------------------------------
// Guides the user through initial project configuration:
//   1. Choose a CSS preprocessor (CSS vanilla / PostCSS / Sass)
//   2. Updates vite.config.js accordingly
//   3. Creates the appropriate src/css entry file
//   4. Updates src/main.js to import the right CSS file
//
// Usage: yarn setup

import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ------------------------------------------------------------
// Simple terminal prompt helper
// ------------------------------------------------------------
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printMenu(title, options) {
  console.log(`\n${title}`);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
}

async function pickOption(title, options) {
  printMenu(title, options);
  let choice;
  while (true) {
    const answer = await prompt(`\nYour choice (1-${options.length}) : `);
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= options.length) {
      choice = num - 1;
      break;
    }
    console.log(`❌ Please enter a number between 1 and ${options.length}.`);
  }
  return choice;
}

// ------------------------------------------------------------
// CSS starter file contents
// ------------------------------------------------------------
const CSS_STARTERS = {
  css: {
    folder: 'css',
    filename: 'main.css',
    content: '',
  },

  postcss: {
    folder: 'css',
    filename: 'main.css',
    content: '',
  },

  sass: {
    folder: 'scss',
    filename: 'main.scss',
    content: '',
  },
};

// ------------------------------------------------------------
// vite.config.js content per preprocessor
// ------------------------------------------------------------
function getViteConfig(preprocessor, folder) {
  const cssConfig =
    preprocessor === 'postcss'
      ? `  css: {
    devSourcemap: true,
    postcss: './postcss.config.js',
  },`
      : `  css: {
    devSourcemap: true,
  },`;

  return `import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outDir = process.env.VITE_BUILD_OUTDIR || 'dist/latest';

export default defineConfig({
  base: './',
  publicDir: 'public',

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@core': resolve(__dirname, 'src/js/core'),
      '@setup': resolve(__dirname, 'src/js/setup'),
      '@modules': resolve(__dirname, 'src/js/modules'),
      '@utils': resolve(__dirname, 'src/js/utils'),
      '@css': resolve(__dirname, 'src/${folder}'),
    },
  },

${cssConfig}

  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: { host: 'localhost', port: 3000, protocol: 'ws' },
    watch: { usePolling: true, interval: 100 },
  },

  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: './src/main.js',
      output: {
        entryFileNames: 'app.js',
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.name || '';
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (ext === 'css') return 'app.css';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext))
            return 'assets/images/[name].[ext]';
          if (/woff|woff2|ttf|otf|eot/i.test(ext)) return 'assets/fonts/[name].[ext]';
          if (ext === 'json') return 'assets/[name].[ext]';
          return 'assets/[name].[ext]';
        },
        compact: true,
      },
    },
  },

  esbuild: {
    target: 'es2025',
    drop: ['debugger'],
    minify: true,
  },
});
`;
}

// ------------------------------------------------------------
// postcss.config.js
// ------------------------------------------------------------
const POSTCSS_CONFIG = `// postcss.config.js
export default {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    autoprefixer: {},
    cssnano: {
      preset: ['default', {
        // Keep important comments (licenses, etc.)
        discardComments: { removeAll: true },
      }],
    },
  },
};
`;

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
async function setup() {
  console.log('\n🐰 Vite Webflow Build System — Setup\n');
  console.log('This script configures your project in a few seconds.');

  // --- Choose CSS preprocessor ---
  const cssChoice = await pickOption('Which CSS preprocessor do you want to use?', [
    'CSS vanilla  (native CSS variables, simple and modern)',
    'PostCSS      (autoprefixer + cssnano + postcss-import + postcss-nested)',
    'Sass / SCSS  (variables, mixins, nesting, breakpoints)',
  ]);

  const preprocessors = ['css', 'postcss', 'sass'];
  const preprocessor = preprocessors[cssChoice];

  console.log(`\n✅ Choice: ${preprocessor.toUpperCase()}\n`);

  // --- Write CSS entry file ---
  const starter = CSS_STARTERS[preprocessor];
  const cssDir = path.join(ROOT, 'src', starter.folder);
  await fs.ensureDir(cssDir);

  const cssFilePath = path.join(cssDir, starter.filename);
  await fs.writeFile(cssFilePath, starter.content);
  console.log(`📝 Created: src/${starter.folder}/${starter.filename}`);

  // --- Update vite.config.js ---
  const viteConfigPath = path.join(ROOT, 'vite.config.js');
  await fs.writeFile(viteConfigPath, getViteConfig(preprocessor, starter.folder));
  console.log(`⚙️  Updated: vite.config.js`);

  // --- Write postcss.config.js if needed ---
  if (preprocessor === 'postcss') {
    const postcssConfigPath = path.join(ROOT, 'postcss.config.js');
    await fs.writeFile(postcssConfigPath, POSTCSS_CONFIG);
    console.log(`⚙️  Created: postcss.config.js`);
  }

  // --- Update src/main.js CSS import ---
  const mainJsPath = path.join(ROOT, 'src', 'main.js');
  const cssImportLine = `import '@css/${starter.filename}';\n`;

  if (await fs.pathExists(mainJsPath)) {
    let mainJs = await fs.readFile(mainJsPath, 'utf-8');
    // Replace any existing CSS import line
    mainJs = mainJs.replace(/^import '@css\/.*';?\n?/m, cssImportLine);
    if (!mainJs.includes(cssImportLine)) {
      mainJs = cssImportLine + mainJs;
    }
    await fs.writeFile(mainJsPath, mainJs);
  } else {
    await fs.writeFile(mainJsPath, `${cssImportLine}\n// JS entry point\n`);
  }
  console.log(`📝 Updated: src/main.js`);

  // --- Done ---
  console.log('\n✨ Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Copy .env.example to .env and fill in your Bunny credentials');
  console.log('  2. Run yarn dev to start developing\n');
}

setup();
