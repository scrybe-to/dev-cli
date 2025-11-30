import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  ssr: {
    target: 'node',
    noExternal: true  // Bundle everything
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    ssr: true,  // Build for Node.js

    lib: {
      entry: resolve(__dirname, 'bin/dev-cli.js'),
      formats: ['es'],
      fileName: () => 'index'
    },

    target: 'node20',
    minify: false,

    rollupOptions: {
      // Keep Node.js built-ins as external
      external: [
        'node:fs',
        'node:path',
        'node:url',
        'node:child_process',
        'node:util',
        'node:events',
        'node:stream',
        'node:os',
        'node:crypto',
        'node:tty',
        'node:process',
        'node:readline',
        'fs',
        'path',
        'url',
        'child_process',
        'util',
        'events',
        'stream',
        'os',
        'crypto',
        'tty',
        'process',
        'readline'
      ],

      output: {
        format: 'es',
        preserveModules: false,
        inlineDynamicImports: true
      }
    },

    sourcemap: false,
    copyPublicDir: false
  },
  plugins: []
});
