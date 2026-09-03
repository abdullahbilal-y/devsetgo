import { defineConfig } from 'tsup';

/**
 * `sharp` ships native binaries and is an optional dependency: bundling it
 * would break native binding resolution and make it mandatory.
 */
const external = ['sharp'];

// Both configs run in parallel, so neither may clean: they would race and
// delete output belonging to the other. The build script clears dist/ first.
const shared = {
  format: ['esm'] as const,
  dts: true,
  sourcemap: true,
  target: 'node20',
  external,
};

export default defineConfig([
  {
    ...shared,
    entry: ['src/index.ts'],
    splitting: true,
  },
  {
    ...shared,
    entry: ['src/cli.ts'],
    splitting: false,
    // Only the executable gets a shebang; a library entry with one confuses
    // downstream bundlers.
    banner: { js: '#!/usr/bin/env node' },
  },
]);
