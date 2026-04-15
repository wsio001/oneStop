import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as esbuild from 'esbuild';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-sw',
      apply: 'build',
      async closeBundle() {
        await esbuild.build({
          entryPoints: ['src/sw.ts'],
          bundle: true,
          outfile: 'dist/sw.js',
          format: 'iife',
          target: 'es2020',
        });
      },
    },
  ],
  server: {
    port: 3000,
  },
});
