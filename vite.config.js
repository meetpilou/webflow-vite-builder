import { defineConfig } from 'vite';
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
      '@css': resolve(__dirname, 'src/css'),
    },
  },

  css: {
    devSourcemap: true,
  },

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
