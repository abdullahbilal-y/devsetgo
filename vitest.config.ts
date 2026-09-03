import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 30000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // Browser code shipped as template-literal strings: never executed in
        // Node, so line coverage here would be meaningless. `runtime.test.ts`
        // asserts on the emitted output instead.
        'src/playground/runtime.ts',
        'src/playground/styles.ts',
        // Sample functions for this repo's own docs site, not library code.
        'src/demos.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Ratcheted to just below current coverage: raise as suites grow,
        // never lower to make a red run go green.
        lines: 78,
        functions: 88,
        branches: 73,
        statements: 78,
      },
    },
  },
});
