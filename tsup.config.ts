import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'sharp',
    '@mermaid-js/mermaid-cli',
    'quickjs-emscripten',
  ],
});
