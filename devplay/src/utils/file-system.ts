/**
 * devplay — File System Utilities
 *
 * File discovery, safe writing, and template copying utilities.
 */

import { readFile, writeFile, mkdir, readdir, stat, copyFile } from 'node:fs/promises';
import { resolve, join, relative, extname, basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { glob } from 'glob';
import { log } from './logger.js';

// ── File Discovery ───────────────────────────────────────────────────

/** Common source code file extensions */
const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts',
  '.jsx', '.tsx', '.py', '.rs', '.go',
]);

/** OpenAPI schema file patterns */
const OPENAPI_PATTERNS = [
  '**/openapi.{yaml,yml,json}',
  '**/swagger.{yaml,yml,json}',
  '**/api-spec.{yaml,yml,json}',
  '**/*.openapi.{yaml,yml,json}',
];

/** Markdown file patterns */
const MARKDOWN_PATTERNS = [
  '**/*.md',
  '**/*.mdx',
];

/** Default ignore patterns */
const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.devplay/**',
  '.git/**',
  'coverage/**',
  '*.min.js',
  '*.bundle.js',
];

/**
 * Discover all source code files in a directory.
 */
export async function findCodeFiles(rootDir: string): Promise<string[]> {
  const patterns = [...CODE_EXTENSIONS].map(ext => `**/*${ext}`);
  return findFiles(rootDir, patterns);
}

/**
 * Discover OpenAPI schema files.
 */
export async function findOpenAPIFiles(rootDir: string): Promise<string[]> {
  return findFiles(rootDir, OPENAPI_PATTERNS);
}

/**
 * Discover Markdown documentation files.
 */
export async function findMarkdownFiles(rootDir: string): Promise<string[]> {
  return findFiles(rootDir, MARKDOWN_PATTERNS);
}

/**
 * Find files matching glob patterns.
 */
export async function findFiles(rootDir: string, patterns: string[]): Promise<string[]> {
  const results: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore: IGNORE_PATTERNS,
      absolute: false,
      nodir: true,
    });
    results.push(...matches);
  }

  // Deduplicate and sort
  return [...new Set(results)].sort();
}

// ── Safe File Writing ────────────────────────────────────────────────

export interface WriteOptions {
  /** Overwrite existing files without prompting */
  overwrite?: boolean;
  /** Create parent directories if they don't exist */
  createDirs?: boolean;
  /** Create a backup before overwriting */
  backup?: boolean;
}

/**
 * Safely write content to a file.
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  options: WriteOptions = {},
): Promise<void> {
  const { overwrite = false, createDirs = true, backup = false } = options;
  const absPath = resolve(filePath);

  // Create parent directories
  if (createDirs) {
    await mkdir(dirname(absPath), { recursive: true });
  }

  // Handle existing files
  if (existsSync(absPath) && !overwrite) {
    log.warn(`File already exists (skipped): ${relative(process.cwd(), absPath)}`);
    return;
  }

  // Create backup
  if (backup && existsSync(absPath)) {
    const backupPath = `${absPath}.bak`;
    await copyFile(absPath, backupPath);
    log.debug(`Backup created: ${relative(process.cwd(), backupPath)}`);
  }

  await writeFile(absPath, content, 'utf-8');
  log.debug(`Written: ${relative(process.cwd(), absPath)}`);
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(resolve(dirPath), { recursive: true });
}

// ── File Content Helpers ─────────────────────────────────────────────

/**
 * Read a file's content as a string.
 */
export async function readFileContent(filePath: string): Promise<string> {
  return readFile(resolve(filePath), 'utf-8');
}

/**
 * Read and parse a JSON file.
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await readFileContent(filePath);
  return JSON.parse(content) as T;
}

/**
 * Get file size in bytes.
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(resolve(filePath));
  return stats.size;
}

/**
 * List all files in a directory recursively.
 */
export async function listFilesRecursive(dirPath: string): Promise<string[]> {
  const results: string[] = [];
  const absDir = resolve(dirPath);

  if (!existsSync(absDir)) return results;

  const entries = await readdir(absDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(absDir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_PATTERNS.some(p => entry.name === p.replace('/**', ''))) {
        const nested = await listFilesRecursive(fullPath);
        results.push(...nested);
      }
    } else {
      results.push(relative(process.cwd(), fullPath));
    }
  }

  return results;
}

/**
 * Format a byte count as a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get the relative path from the current working directory.
 */
export function relPath(absPath: string): string {
  return relative(process.cwd(), resolve(absPath));
}

export const fs = {
  findCodeFiles,
  findOpenAPIFiles,
  findMarkdownFiles,
  findFiles,
  safeWriteFile,
  ensureDir,
  readFileContent,
  readJsonFile,
  getFileSize,
  listFilesRecursive,
  formatBytes,
  relPath,
};

export default fs;
