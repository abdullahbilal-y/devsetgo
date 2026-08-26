/**
 * devplay — Markdown Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdownFile, getExecutableBlocks } from '../../src/parser/markdown-parser.js';
import { resolve } from 'node:path';

const FIXTURE_PATH = resolve(import.meta.dirname, '../fixtures/sample.md');

describe('Markdown Parser', () => {
  it('should split Markdown into sections by heading', async () => {
    const sections = await parseMarkdownFile(FIXTURE_PATH);

    expect(sections.length).toBeGreaterThanOrEqual(4);

    const titles = sections.map(s => s.title);
    expect(titles).toContain('Sample Project');
    expect(titles).toContain('Installation');
    expect(titles).toContain('Usage');
  });

  it('should extract fenced code blocks', async () => {
    const sections = await parseMarkdownFile(FIXTURE_PATH);

    const installSection = sections.find(s => s.title === 'Installation');
    expect(installSection).toBeDefined();
    expect(installSection!.codeBlocks.length).toBe(1);
    expect(installSection!.codeBlocks[0].language).toBe('bash');
    expect(installSection!.codeBlocks[0].code).toContain('npm install');
  });

  it('should detect executable code blocks', async () => {
    const sections = await parseMarkdownFile(FIXTURE_PATH);
    const execBlocks = getExecutableBlocks(sections);

    // Should detect JS code with imports/console.log and bash commands
    expect(execBlocks.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect correct heading levels', async () => {
    const sections = await parseMarkdownFile(FIXTURE_PATH);

    const h1 = sections.find(s => s.title === 'Sample Project');
    expect(h1).toBeDefined();
    expect(h1!.level).toBe(1);

    const h2 = sections.find(s => s.title === 'Installation');
    expect(h2).toBeDefined();
    expect(h2!.level).toBe(2);
  });

  it('should detect code block languages', async () => {
    const sections = await parseMarkdownFile(FIXTURE_PATH);
    const allBlocks = sections.flatMap(s => s.codeBlocks);

    const languages = allBlocks.map(b => b.language);
    expect(languages).toContain('bash');
    expect(languages).toContain('javascript');
    expect(languages).toContain('json');
  });
});
