/**
 * devsetgo — WASM Compiler Tests
 */

import { describe, it, expect } from 'vitest';
import {
  prepareSnippetsForExecution,
  generateWASMRuntime,
} from '../../src/playground/wasm-compiler.js';
import type { CodeSnippet } from '../../src/parser/types.js';

const makeSnippet = (overrides: Partial<CodeSnippet> = {}): CodeSnippet => ({
  id: 'test_snippet',
  title: 'Test Snippet',
  description: 'A test snippet',
  code: 'function greet(name) { return `Hello, ${name}!`; }',
  language: 'javascript',
  sourceFile: 'src/index.js',
  lineRange: { start: 1, end: 3 },
  runnable: true,
  category: 'basics',
  ...overrides,
});

describe('WASM Compiler', () => {
  describe('prepareSnippetsForExecution', () => {
    it('should only include JS/TS snippets', () => {
      const snippets = [
        makeSnippet({ language: 'javascript' }),
        makeSnippet({ id: 'py', language: 'python', code: 'print("hello")' }),
        makeSnippet({ id: 'go', language: 'go', code: 'fmt.Println("hi")' }),
      ];

      const compiled = prepareSnippetsForExecution(snippets);
      expect(compiled.every(s => ['javascript', 'typescript'].includes(s.language))).toBe(true);
      expect(compiled.length).toBe(1);
    });

    it('should strip TypeScript type annotations', () => {
      const tsSnippet = makeSnippet({
        id: 'ts_test',
        language: 'typescript',
        code: `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
        `.trim(),
      });

      const compiled = prepareSnippetsForExecution([tsSnippet]);
      expect(compiled.length).toBe(1);
      // The compiled code should be valid JS (no TS-specific syntax causing issues)
      expect(compiled[0].code).toBeDefined();
      expect(compiled[0].code.length).toBeGreaterThan(0);
    });

    it('should wrap bare expressions with console.log', () => {
      const snippet = makeSnippet({
        code: `const x = 1 + 2\nx`,
      });
      const compiled = prepareSnippetsForExecution([snippet]);
      expect(compiled.length).toBe(1);
      // Should have wrapped the trailing expression
      expect(compiled[0].code).toContain('console.log');
    });

    it('should not double-wrap code that already has console.log', () => {
      const snippet = makeSnippet({
        code: `console.log("already logged")`,
      });
      const compiled = prepareSnippetsForExecution([snippet]);
      const count = (compiled[0].code.match(/console\.log/g) || []).length;
      expect(count).toBe(1);
    });

    it('should preserve snippet metadata', () => {
      const snippet = makeSnippet({
        id: 'meta_test',
        title: 'My Test',
        description: 'A useful test',
        category: 'advanced',
        expectedOutput: '42',
      });

      const compiled = prepareSnippetsForExecution([snippet]);
      expect(compiled[0].id).toBe('meta_test');
      expect(compiled[0].title).toBe('My Test');
      expect(compiled[0].description).toBe('A useful test');
      expect(compiled[0].category).toBe('advanced');
      expect(compiled[0].expectedOutput).toBe('42');
    });

    it('should assign default category if missing', () => {
      const snippet = makeSnippet({ category: undefined });
      const compiled = prepareSnippetsForExecution([snippet]);
      expect(compiled[0].category).toBe('examples');
    });

    it('should handle an empty snippet list', () => {
      const compiled = prepareSnippetsForExecution([]);
      expect(compiled).toEqual([]);
    });
  });

  describe('generateWASMRuntime', () => {
    it('should return a non-empty string', () => {
      const runtime = generateWASMRuntime();
      expect(typeof runtime).toBe('string');
      expect(runtime.length).toBeGreaterThan(100);
    });

    it('should reference quickjs-emscripten', () => {
      const runtime = generateWASMRuntime();
      expect(runtime).toContain('quickjs-emscripten');
    });

    it('should export initRuntime and executeCode', () => {
      const runtime = generateWASMRuntime();
      expect(runtime).toContain('initRuntime');
      expect(runtime).toContain('executeCode');
    });

    it('should expose window.__devsetgo', () => {
      const runtime = generateWASMRuntime();
      expect(runtime).toContain('__devsetgo');
    });
  });
});
