/**
 * devsetgo — Code Parser Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('annotation matching boundaries', () => {
  let workDir: string;

  beforeEach(async () => {
    const { mkdtemp } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    workDir = await mkdtemp(join(tmpdir(), 'devsetgo-parser-'));
  });

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(workDir, { recursive: true, force: true });
  });

  /** Write a source file into the temp dir and parse it. */
  async function parse(source: string) {
    const { writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const file = join(workDir, 'sample.ts');
    await writeFile(file, source, 'utf-8');
    return parseCodeFile(file);
  }

  it('ignores prose that merely mentions the tag inline', async () => {
    // A file documenting the annotation is not a file using it. Treating a
    // mention as an annotation published fragments of the parser's own source.
    const snippets = await parse(
      [
        '/**',
        ' * Regex to match a `@playground` annotation in a JSDoc block.',
        ' */',
        'const PATTERN = /x/;',
        '',
        'export function helper() {',
        '  return 1;',
        '}',
      ].join('\n'),
    );

    expect(snippets.filter((s) => s.runnable)).toHaveLength(0);
  });

  it('matches the tag when it starts a JSDoc line', async () => {
    const snippets = await parse(
      [
        '/**',
        ' * @playground {"title": "Real One", "runnable": true}',
        ' */',
        'export function real() {',
        '  console.log(1);',
        '}',
      ].join('\n'),
    );

    expect(snippets.map((s) => s.title)).toContain('Real One');
  });

  it('does not let one annotation span across separate comment blocks', async () => {
    // An unbounded matcher opens at the first `/**` and closes at a later
    // comment, slicing the code in between into a bogus snippet.
    const snippets = await parse(
      [
        '/**',
        ' * An ordinary comment.',
        ' */',
        "const secret = 'should not be published';",
        '',
        '/**',
        ' * @playground {"title": "Wanted"}',
        ' */',
        'export function wanted() {',
        '  console.log(2);',
        '}',
      ].join('\n'),
    );

    for (const snippet of snippets) {
      expect(snippet.code).not.toContain('should not be published');
    }
  });

  it('emits nothing when no declaration follows the annotation', async () => {
    // The old fallback returned the next 20 lines regardless, which sliced
    // imports and half-expressions into "runnable" examples.
    const snippets = await parse(
      [
        '/**',
        ' * @playground {"title": "Dangling"}',
        ' */',
        '',
        "import { thing } from './thing.js';",
      ].join('\n'),
    );

    expect(snippets.filter((s) => s.runnable)).toHaveLength(0);
  });

  it('never publishes a runnable snippet containing an import', async () => {
    const snippets = await parse(
      [
        "import { createLogger } from './logger.js';",
        '',
        '/**',
        ' * @playground {"title": "Clean", "runnable": true}',
        ' */',
        'export function clean() {',
        '  console.log(3);',
        '}',
      ].join('\n'),
    );

    for (const snippet of snippets.filter((s) => s.runnable)) {
      expect(snippet.code).not.toMatch(/^\s*import\s/m);
    }
  });
});
