/**
 * devsetgo — Code Parser
 *
 * Extracts executable code snippets from source files.
 * Detects @playground annotations and function signatures.
 */

import { readFile } from 'node:fs/promises';
import { resolve, extname, basename } from 'node:path';
import { createLogger } from '../utils/logger.js';
import type { CodeSnippet } from './types.js';

const logger = createLogger('code-parser');

/** Regex to match @playground JSDoc annotations */
const PLAYGROUND_ANNOTATION = /\/\*\*[\s\S]*?@playground(?:\s+(\{[\s\S]*?\}))?[\s\S]*?\*\//g;

/** Regex to match export statements */
const EXPORT_REGEX = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;

/** Regex to extract function signatures */
const FUNCTION_REGEX = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;

/** Regex for JSDoc comments */
const JSDOC_REGEX = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g;

/**
 * Language detection from file extension.
 */
function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.mts': 'typescript',
    '.cts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
  };
  return langMap[ext] || 'text';
}

/**
 * Parse @playground annotations and extract metadata.
 */
function parsePlaygroundAnnotation(annotationBody: string | undefined): {
  title?: string;
  category?: string;
  runnable?: boolean;
  expectedOutput?: string;
  dependencies?: string[];
} {
  if (!annotationBody) return {};

  try {
    // Try parsing as JSON-like metadata
    const cleaned = annotationBody.replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

/**
 * Extract the code block associated with an annotated function/export.
 */
function extractAnnotatedBlock(
  content: string,
  annotationEnd: number,
): { code: string; lineRange: { start: number; end: number } } {
  const afterAnnotation = content.slice(annotationEnd);

  // Find the start of the next function/class/const definition
  const defMatch = afterAnnotation.match(
    /^[\s\n]*((?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+[\s\S]*?)(?=\n\n(?:\/\*|export|function|class|const|let|var|import)|$)/,
  );

  if (!defMatch) {
    // Fallback: take the next ~20 lines
    const lines = afterAnnotation.split('\n').slice(0, 20);
    const code = lines.join('\n').trim();
    const startLine = content.slice(0, annotationEnd).split('\n').length;
    return {
      code,
      lineRange: { start: startLine, end: startLine + lines.length },
    };
  }

  const code = defMatch[1].trim();
  const startLine = content.slice(0, annotationEnd).split('\n').length;
  const endLine = startLine + code.split('\n').length;

  return { code, lineRange: { start: startLine, end: endLine } };
}

/**
 * Extract JSDoc description from a comment block.
 */
function extractDescription(jsdoc: string): string {
  return jsdoc
    .replace(/\/\*\*|\*\//g, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .filter(line => !line.startsWith('@'))
    .join(' ')
    .trim();
}

/**
 * Parse a single source file for code snippets.
 */
export async function parseCodeFile(filePath: string): Promise<CodeSnippet[]> {
  const absPath = resolve(filePath);
  const content = await readFile(absPath, 'utf-8');
  const language = detectLanguage(filePath);
  const snippets: CodeSnippet[] = [];

  logger.debug(`Parsing ${filePath} (${language})`);

  // Strategy 1: Find @playground annotations
  let match;
  PLAYGROUND_ANNOTATION.lastIndex = 0;

  while ((match = PLAYGROUND_ANNOTATION.exec(content)) !== null) {
    const metadata = parsePlaygroundAnnotation(match[1]);
    const annotationEnd = match.index + match[0].length;
    const { code, lineRange } = extractAnnotatedBlock(content, annotationEnd);

    // Extract the name from the code block
    const nameMatch = code.match(/(?:function|class|const|let|var)\s+(\w+)/);
    const name = nameMatch?.[1] || `snippet_${snippets.length + 1}`;

    snippets.push({
      id: `${basename(filePath, extname(filePath))}_${name}`,
      title: metadata.title || name,
      description: extractDescription(match[0]),
      code,
      language,
      sourceFile: filePath,
      lineRange,
      runnable: metadata.runnable !== false,
      expectedOutput: metadata.expectedOutput,
      dependencies: metadata.dependencies,
      category: metadata.category,
    });
  }

  // Strategy 2: If no @playground annotations, use a safe line-based scan for
  // exported functions with JSDoc. We deliberately avoid nested regex patterns
  // to prevent catastrophic backtracking on large template/style files.
  const hasJSDoc = content.includes('/**');

  if (snippets.length === 0 && hasJSDoc) {
    const lines = content.split('\n');
    let jsdocStart = -1;
    let jsdocLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Start of JSDoc block
      if (trimmed === '/**' || trimmed.startsWith('/** ')) {
        jsdocStart = i;
        jsdocLines = [line];
        continue;
      }

      // Inside JSDoc block
      if (jsdocStart >= 0 && trimmed.startsWith('*')) {
        jsdocLines.push(line);
        if (trimmed === '*/') {
          // End of JSDoc — check if next non-empty line is an export
          let nextLine = '';
          let nextIdx = i + 1;
          while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
          if (nextIdx < lines.length) nextLine = lines[nextIdx];

          const exportMatch = nextLine.match(
            /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const)\s+(\w+)/
          );

          if (exportMatch) {
            const name = exportMatch[1];
            const description = extractDescription(jsdocLines.join('\n'));
            // Grab just the next 15 lines as the "code" preview
            const previewLines = lines.slice(nextIdx, nextIdx + 15);
            const code = previewLines.join('\n').trim();

            snippets.push({
              id: `${basename(filePath, extname(filePath))}_${name}`,
              title: name,
              description,
              code,
              language,
              sourceFile: filePath,
              lineRange: { start: nextIdx + 1, end: nextIdx + 15 },
              runnable: false,
              category: 'exported',
            });
          }

          jsdocStart = -1;
          jsdocLines = [];
        }
        continue;
      }

      // Non-JSDoc line resets the block
      if (jsdocStart >= 0 && !trimmed.startsWith('*')) {
        jsdocStart = -1;
        jsdocLines = [];
      }
    }
  }

  logger.debug(`Found ${snippets.length} snippets in ${filePath}`);
  return snippets;
}

/**
 * Parse multiple source files for code snippets.
 */
export async function parseCodeFiles(filePaths: string[]): Promise<CodeSnippet[]> {
  const allSnippets: CodeSnippet[] = [];

  for (const filePath of filePaths) {
    try {
      const snippets = await parseCodeFile(filePath);
      allSnippets.push(...snippets);
    } catch (err) {
      logger.warn(`Failed to parse ${filePath}: ${err}`);
    }
  }

  logger.info(`Extracted ${allSnippets.length} code snippets from ${filePaths.length} files`);
  return allSnippets;
}

/**
 * Extract export names from a source file.
 */
export async function extractExports(filePath: string): Promise<string[]> {
  const content = await readFile(resolve(filePath), 'utf-8');
  const exports: string[] = [];

  EXPORT_REGEX.lastIndex = 0;
  let match;
  while ((match = EXPORT_REGEX.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

export default parseCodeFiles;
