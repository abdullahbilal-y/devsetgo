/**
 * devsetgo — Code Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseCodeFile, extractExports } from '../../src/parser/code-parser.js';
import { resolve } from 'node:path';

const FIXTURE_PATH = resolve(import.meta.dirname, '../fixtures/sample.js');

describe('Code Parser', () => {
  describe('parseCodeFile', () => {
    it('should extract @playground annotated snippets', async () => {
      const snippets = await parseCodeFile(FIXTURE_PATH);

      // Should find the two @playground-annotated functions
      expect(snippets.length).toBeGreaterThanOrEqual(2);

      const greetSnippet = snippets.find((s) => s.title === 'Greet Function');
      expect(greetSnippet).toBeDefined();
      expect(greetSnippet!.category).toBe('basics');
      expect(greetSnippet!.runnable).toBe(true);
      expect(greetSnippet!.language).toBe('javascript');
    });

    it('should extract snippet metadata correctly', async () => {
      const snippets = await parseCodeFile(FIXTURE_PATH);

      const fibSnippet = snippets.find((s) => s.title === 'Fibonacci');
      expect(fibSnippet).toBeDefined();
      expect(fibSnippet!.category).toBe('algorithms');
      expect(fibSnippet!.expectedOutput).toBe('55');
    });

    it('should detect the correct language', async () => {
      const snippets = await parseCodeFile(FIXTURE_PATH);
      for (const snippet of snippets) {
        expect(snippet.language).toBe('javascript');
      }
    });

    it('should include code content', async () => {
      const snippets = await parseCodeFile(FIXTURE_PATH);
      for (const snippet of snippets) {
        expect(snippet.code.length).toBeGreaterThan(0);
        expect(snippet.code).toContain('function');
      }
    });
  });

  describe('extractExports', () => {
    it('should find exported symbols', async () => {
      const exports = await extractExports(FIXTURE_PATH);
      expect(exports).toContain('greet');
      expect(exports).toContain('fibonacci');
      expect(exports).toContain('transformData');
    });
  });
});
