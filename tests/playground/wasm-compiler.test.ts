/**
 * devsetgo — Snippet Preparation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  prepareSnippetsForExecution,
  prepareCode,
  appendAutoInvocation,
  stripTypeAnnotations,
  wrapWithOutputCapture,
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

describe('Snippet preparation', () => {
  describe('prepareSnippetsForExecution', () => {
    it('should only include JS/TS snippets', () => {
      const snippets = [
        makeSnippet({ language: 'javascript' }),
        makeSnippet({ id: 'py', language: 'python', code: 'print("hello")' }),
        makeSnippet({ id: 'go', language: 'go', code: 'fmt.Println("hi")' }),
      ];

      const compiled = prepareSnippetsForExecution(snippets);
      expect(compiled.every((s) => ['javascript', 'typescript'].includes(s.language))).toBe(true);
      expect(compiled.length).toBe(1);
    });

    it('should strip TypeScript type annotations', () => {
      const tsSnippet = makeSnippet({
        id: 'ts_test',
        language: 'typescript',
        code: 'function greet(name: string): string {\n  return `Hello, ${name}!`;\n}',
      });

      const compiled = prepareSnippetsForExecution([tsSnippet]);
      expect(compiled.length).toBe(1);
      expect(compiled[0].code).not.toContain(': string');
    });

    it('should wrap bare expressions with console.log', () => {
      const snippet = makeSnippet({ code: 'const x = 1 + 2\nx' });
      const compiled = prepareSnippetsForExecution([snippet]);
      expect(compiled.length).toBe(1);
      expect(compiled[0].code).toContain('console.log');
    });

    it('should not double-wrap code that already has console.log', () => {
      const snippet = makeSnippet({ code: 'console.log("already logged")' });
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

    it('should prefer annotated snippets when any are annotated', () => {
      const snippets = [
        makeSnippet({ id: 'annotated', runnable: true }),
        makeSnippet({ id: 'plain', runnable: false }),
      ];

      const compiled = prepareSnippetsForExecution(snippets);
      expect(compiled.map((s) => s.id)).toEqual(['annotated']);
    });

    it('should fall back to all JS/TS snippets when none are annotated', () => {
      const snippets = [
        makeSnippet({ id: 'a', runnable: false }),
        makeSnippet({ id: 'b', runnable: false }),
      ];

      const compiled = prepareSnippetsForExecution(snippets);
      expect(compiled.map((s) => s.id)).toEqual(['a', 'b']);
    });
  });

  describe('appendAutoInvocation', () => {
    it('appends a call for a declared-but-uncalled function', () => {
      const out = appendAutoInvocation('function greet() { return 1; }');
      expect(out).toContain('greet();');
    });

    it('does not append when the function is already called at top level', () => {
      const code = ['function greet() { return 1; }', 'greet();'].join('\n');
      // The input is already complete, so it must come back byte-identical —
      // a second appended call would run the demo twice.
      expect(appendAutoInvocation(code)).toBe(code);
    });

    it('still appends for a recursive function whose only call is internal', () => {
      // A body-wide search would see `fib(n - 1)` and wrongly conclude the
      // function is already invoked, leaving the demo silent.
      const code = [
        'function fib(n) {',
        '  if (n <= 1) return n;',
        '  return fib(n - 1) + fib(n - 2);',
        '}',
      ].join('\n');

      expect(appendAutoInvocation(code)).toContain('fib();');
    });

    it('leaves code with no function declaration untouched', () => {
      const code = 'const x = 1;';
      expect(appendAutoInvocation(code)).toBe(code);
    });

    it('handles async function declarations', () => {
      const out = appendAutoInvocation('async function load() { return 1; }');
      expect(out).toContain('load();');
    });
  });

  describe('stripTypeAnnotations', () => {
    it('removes parameter and return types', () => {
      const out = stripTypeAnnotations('function f(a: string): number { return 1; }');
      expect(out).not.toContain(': string');
      expect(out).not.toContain(': number');
    });

    it('preserves object literal colons', () => {
      const out = stripTypeAnnotations('const o = { a: 1, b: 2 };');
      expect(out).toContain('a: 1');
      expect(out).toContain('b: 2');
    });

    it('returns a string even for unparseable input', () => {
      expect(typeof stripTypeAnnotations('@@@ not javascript @@@')).toBe('string');
    });
  });

  describe('wrapWithOutputCapture', () => {
    it('wraps a trailing bare expression', () => {
      expect(wrapWithOutputCapture('const x = 1\nx')).toContain('console.log(x)');
    });

    it('leaves a trailing statement alone', () => {
      const code = 'const x = 1;\nif (x) { doThing(); }';
      expect(wrapWithOutputCapture(code)).toBe(code);
    });

    it('leaves a trailing closing brace alone', () => {
      const code = 'function f() {\n  return 1;\n}';
      expect(wrapWithOutputCapture(code)).toBe(code);
    });

    it('leaves a trailing comment alone', () => {
      const code = 'const x = 1;\n// done';
      expect(wrapWithOutputCapture(code)).toBe(code);
    });
  });

  describe('prepareCode', () => {
    it('strips export keywords so the sandbox can eval the snippet', () => {
      const out = prepareCode('export function greet() { console.log(1); }', 'javascript');
      expect(out).not.toMatch(/^\s*export\s/m);
    });

    it('strips export default', () => {
      const out = prepareCode('export default function greet() { console.log(1); }', 'javascript');
      expect(out).not.toContain('export default');
    });
  });
});
