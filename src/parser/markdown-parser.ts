/**
 * devsetgo — Markdown Parser
 *
 * Parses Markdown documentation files, extracting sections and code blocks.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createLogger } from '../utils/logger.js';
import type { DocSection, DocCodeBlock } from './types.js';

const logger = createLogger('markdown-parser');

/** Regex to match fenced code blocks */
const FENCED_CODE_REGEX = /```(\w+)?\s*\n([\s\S]*?)```/g;

/** Patterns that indicate a code block is executable */
const EXECUTABLE_PATTERNS = [
  /\bfunction\b/,
  /\bclass\b/,
  /\bimport\b/,
  /\brequire\b/,
  /\bconst\b.*=.*=>/,
  /\bconsole\.\w+/,
  /\bdef\b/,
  /\bfn\b/,
  /\bfunc\b/,
  /\bprint[ln]?\b/,
  /\breturn\b/,
  /^[$#]\s/m, // Shell commands
  /\bnpm\b|\byarn\b|\bpnpm\b/,
  /\bcurl\b/,
];

/**
 * Detect whether a code block looks executable.
 */
function isCodeBlockExecutable(code: string, language: string): boolean {
  // Shell commands are "executable" in a different sense
  if (['bash', 'sh', 'shell', 'zsh', 'console', 'terminal'].includes(language)) {
    return true;
  }

  // Check for executable patterns in the code
  return EXECUTABLE_PATTERNS.some((pattern) => pattern.test(code));
}

/**
 * Extract fenced code blocks from Markdown content.
 */
function extractCodeBlocks(content: string): DocCodeBlock[] {
  const blocks: DocCodeBlock[] = [];

  FENCED_CODE_REGEX.lastIndex = 0;
  let match;

  while ((match = FENCED_CODE_REGEX.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();

    blocks.push({
      language,
      code,
      isExecutable: isCodeBlockExecutable(code, language),
    });
  }

  return blocks;
}

/**
 * Split Markdown content into sections by headings.
 */
function splitIntoSections(content: string, sourceFile: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = content.split('\n');

  let currentSection: DocSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save the previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.codeBlocks = extractCodeBlocks(currentSection.content);
        sections.push(currentSection);
      }

      // Start a new section
      currentSection = {
        title: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: '',
        codeBlocks: [],
        sourceFile,
      };
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save the last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.codeBlocks = extractCodeBlocks(currentSection.content);
    sections.push(currentSection);
  }

  // If no headings found, treat the entire content as one section
  if (sections.length === 0 && content.trim().length > 0) {
    const codeBlocks = extractCodeBlocks(content);
    sections.push({
      title: 'Document',
      level: 1,
      content: content.trim(),
      codeBlocks,
      sourceFile,
    });
  }

  return sections;
}

/**
 * Parse a single Markdown file.
 */
export async function parseMarkdownFile(filePath: string): Promise<DocSection[]> {
  const absPath = resolve(filePath);
  logger.debug(`Parsing Markdown: ${filePath}`);

  let content: string;
  try {
    content = await readFile(absPath, 'utf-8');
  } catch (err) {
    logger.warn(`Failed to read ${filePath}: ${err}`);
    return [];
  }

  // Strip frontmatter (YAML between --- delimiters)
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (frontmatterMatch) {
    content = content.slice(frontmatterMatch[0].length);
  }

  const sections = splitIntoSections(content, filePath);
  logger.debug(`Found ${sections.length} sections in ${filePath}`);

  return sections;
}

/**
 * Parse multiple Markdown files.
 */
export async function parseMarkdownFiles(filePaths: string[]): Promise<DocSection[]> {
  const allSections: DocSection[] = [];

  for (const filePath of filePaths) {
    try {
      const sections = await parseMarkdownFile(filePath);
      allSections.push(...sections);
    } catch (err) {
      logger.warn(`Failed to parse ${filePath}: ${err}`);
    }
  }

  logger.info(
    `Extracted ${allSections.length} documentation sections from ${filePaths.length} files`,
  );
  return allSections;
}

/**
 * Extract all executable code blocks from parsed sections.
 */
export function getExecutableBlocks(sections: DocSection[]): DocCodeBlock[] {
  return sections.flatMap((s) => s.codeBlocks).filter((block) => block.isExecutable);
}

export default parseMarkdownFiles;
