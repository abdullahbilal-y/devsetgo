// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.devsetgo/**', 'assets/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        // A dedicated tsconfig: the build one excludes tests, and type-aware
        // rules need every linted file to be part of a program.
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Unused values are almost always a mistake; an underscore prefix is the
      // opt-out for deliberately ignored arguments and destructured rest.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // `any` defeats the type checker. The config deep-merge legitimately
      // needs it and carries a targeted disable comment.
      '@typescript-eslint/no-explicit-any': 'warn',

      // A floating promise silently swallows failures, which is how a broken
      // build ends up reporting success.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      'no-console': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
    },
  },

  {
    files: ['tests/**/*.ts'],
    rules: {
      // Tests deliberately construct malformed input.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
