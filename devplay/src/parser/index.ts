/**
 * devplay — Unified Parser
 *
 * Dispatches to format-specific parsers and produces a ProjectManifest.
 */

import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createLogger } from '../utils/logger.js';
import { findCodeFiles, findOpenAPIFiles, findMarkdownFiles } from '../utils/file-system.js';
import { parseCodeFiles, extractExports } from './code-parser.js';
import { parseOpenAPIFiles } from './openapi-parser.js';
import { parseMarkdownFiles } from './markdown-parser.js';
import type {
  ProjectManifest,
  DevPlayConfig,
  ModuleInfo,
  DependencyInfo,
} from './types.js';

const logger = createLogger('parser');

/**
 * Parse an entire project and produce a unified ProjectManifest.
 */
export async function parseProject(
  rootDir: string,
  config: DevPlayConfig,
): Promise<ProjectManifest> {
  const absRoot = resolve(rootDir);
  logger.info(`Parsing project at ${absRoot}`);

  // 1. Discover files
  const [codeFiles, openAPIFiles, markdownFiles] = await Promise.all([
    findCodeFiles(absRoot),
    findOpenAPIFiles(absRoot),
    findMarkdownFiles(absRoot),
  ]);

  logger.info(
    `Found: ${codeFiles.length} code, ${openAPIFiles.length} OpenAPI, ${markdownFiles.length} Markdown files`,
  );

  // 2. Parse all file types in parallel
  const [codeSnippets, apiEndpoints, docSections] = await Promise.all([
    parseCodeFiles(codeFiles.map(f => join(absRoot, f))),
    parseOpenAPIFiles(openAPIFiles.map(f => join(absRoot, f))),
    parseMarkdownFiles(markdownFiles.map(f => join(absRoot, f))),
  ]);

  // 3. Detect modules
  const modules = await detectModules(absRoot, codeFiles);

  // 4. Detect dependencies
  const dependencies = await detectDependencies(absRoot);

  const manifest: ProjectManifest = {
    project: config.project,
    codeSnippets,
    apiEndpoints,
    docSections,
    modules,
    dependencies,
  };

  logger.success(
    `Project parsed: ${codeSnippets.length} snippets, ${apiEndpoints.length} endpoints, ${docSections.length} doc sections`,
  );

  return manifest;
}

/**
 * Detect module structure from the codebase.
 */
async function detectModules(rootDir: string, codeFiles: string[]): Promise<ModuleInfo[]> {
  const modules: ModuleInfo[] = [];
  const dirMap = new Map<string, string[]>();

  // Group files by directory
  for (const file of codeFiles) {
    const parts = file.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';

    if (!dirMap.has(dir)) {
      dirMap.set(dir, []);
    }
    dirMap.get(dir)!.push(file);
  }

  // Check each directory for index files (indicating a module)
  for (const [dir, files] of dirMap) {
    const hasIndex = files.some(f =>
      f.endsWith('/index.ts') ||
      f.endsWith('/index.js') ||
      f.endsWith('/mod.ts') ||
      f.endsWith('/lib.rs') ||
      f.endsWith('/__init__.py')
    );

    if (hasIndex || files.length >= 3) {
      const indexFile = files.find(f =>
        f.endsWith('/index.ts') || f.endsWith('/index.js')
      );

      let exports: string[] = [];
      if (indexFile) {
        try {
          exports = await extractExports(join(rootDir, indexFile));
        } catch {
          // Ignore export detection failures
        }
      }

      modules.push({
        name: dir === '.' ? 'root' : dir.split('/').pop() || dir,
        path: dir,
        exports,
        internalDependencies: [],
        description: undefined,
      });
    }
  }

  // Detect internal dependencies between modules
  for (const mod of modules) {
    for (const file of dirMap.get(mod.path) || []) {
      try {
        const content = await readFile(join(rootDir, file), 'utf-8');
        for (const otherMod of modules) {
          if (otherMod.name !== mod.name) {
            // Check for imports from other modules
            const importPattern = new RegExp(
              `(?:import|require).*['"\`].*${otherMod.name}.*['"\`]`,
            );
            if (importPattern.test(content)) {
              if (!mod.internalDependencies.includes(otherMod.name)) {
                mod.internalDependencies.push(otherMod.name);
              }
            }
          }
        }
      } catch {
        // Ignore read failures
      }
    }
  }

  return modules;
}

/**
 * Detect project dependencies from package.json, Cargo.toml, etc.
 */
async function detectDependencies(rootDir: string): Promise<DependencyInfo[]> {
  const deps: DependencyInfo[] = [];

  // Check package.json (Node.js)
  const packageJsonPath = join(rootDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const raw = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(raw);

      if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
          deps.push({
            name,
            version: String(version),
            type: 'production',
          });
        }
      }

      if (pkg.devDependencies) {
        for (const [name, version] of Object.entries(pkg.devDependencies)) {
          deps.push({
            name,
            version: String(version),
            type: 'development',
          });
        }
      }
    } catch {
      logger.debug('Could not parse package.json for dependencies');
    }
  }

  return deps;
}

export default parseProject;
