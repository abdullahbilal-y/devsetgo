/**
 * devsetgo — Diagram Generator
 *
 * Generates architecture diagrams from the project manifest.
 * Outputs Mermaid code for GitHub embedding and optionally SVG/PNG via mermaid-cli.
 */

import { join } from 'node:path';
import { createLogger } from '../utils/logger.js';
import { safeWriteFile, ensureDir } from '../utils/file-system.js';
import type { ProjectManifest, DevSetGoConfig, GeneratedFile } from '../parser/types.js';

const logger = createLogger('diagrams');

/**
 * Generate architecture diagrams from the project manifest.
 */
export async function generateDiagrams(
  rootDir: string,
  manifest: ProjectManifest,
  config: DevSetGoConfig,
): Promise<GeneratedFile[]> {
  const outputDir = join(rootDir, config.assets.output_dir, 'diagrams');
  await ensureDir(outputDir);

  const files: GeneratedFile[] = [];

  // 1. Module architecture diagram
  if (manifest.modules.length > 0) {
    const moduleDiagram = generateModuleDiagram(manifest);
    const mermaidPath = join(outputDir, 'architecture.mermaid');
    await safeWriteFile(mermaidPath, moduleDiagram, { overwrite: true });
    files.push({
      path: `${config.assets.output_dir}/diagrams/architecture.mermaid`,
      size: Buffer.byteLength(moduleDiagram, 'utf-8'),
      type: 'mermaid',
    });
    logger.success('Generated module architecture diagram');
  }

  // 2. API flow diagram (if endpoints exist)
  if (manifest.apiEndpoints.length > 0) {
    const apiDiagram = generateAPIFlowDiagram(manifest);
    const mermaidPath = join(outputDir, 'api-flow.mermaid');
    await safeWriteFile(mermaidPath, apiDiagram, { overwrite: true });
    files.push({
      path: `${config.assets.output_dir}/diagrams/api-flow.mermaid`,
      size: Buffer.byteLength(apiDiagram, 'utf-8'),
      type: 'mermaid',
    });
    logger.success('Generated API flow diagram');
  }

  // 3. Dependency graph
  if (manifest.dependencies.length > 0) {
    const depDiagram = generateDependencyDiagram(manifest);
    const mermaidPath = join(outputDir, 'dependencies.mermaid');
    await safeWriteFile(mermaidPath, depDiagram, { overwrite: true });
    files.push({
      path: `${config.assets.output_dir}/diagrams/dependencies.mermaid`,
      size: Buffer.byteLength(depDiagram, 'utf-8'),
      type: 'mermaid',
    });
    logger.success('Generated dependency diagram');
  }

  // 4. Generate SVG renders if format includes svg or all
  if (config.assets.diagrams.format === 'svg' || config.assets.diagrams.format === 'all') {
    for (const file of [...files]) {
      if (file.type === 'mermaid') {
        const svgFile = await renderMermaidToSVG(rootDir, file.path);
        if (svgFile) files.push(svgFile);
      }
    }
  }

  return files;
}

/**
 * Generate a module architecture Mermaid diagram.
 */
function generateModuleDiagram(manifest: ProjectManifest): string {
  const lines: string[] = ['graph TB'];

  // Style definitions
  lines.push('    classDef moduleStyle fill:#1e1e32,stroke:#7c3aed,stroke-width:2px,color:#e8e8f0');
  lines.push('    classDef rootStyle fill:#7c3aed,stroke:#a78bfa,stroke-width:2px,color:#ffffff');
  lines.push('');

  // Add modules
  for (const mod of manifest.modules) {
    const id = sanitizeId(mod.name);
    const exportList = mod.exports.length > 0
      ? `<br/><i>${mod.exports.slice(0, 4).join(', ')}${mod.exports.length > 4 ? '...' : ''}</i>`
      : '';

    if (mod.name === 'root') {
      lines.push(`    ${id}["📦 ${mod.name}${exportList}"]:::rootStyle`);
    } else {
      lines.push(`    ${id}["📁 ${mod.name}${exportList}"]:::moduleStyle`);
    }
  }

  lines.push('');

  // Add dependency arrows
  for (const mod of manifest.modules) {
    const fromId = sanitizeId(mod.name);
    for (const dep of mod.internalDependencies) {
      const toId = sanitizeId(dep);
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate an API flow Mermaid diagram.
 */
function generateAPIFlowDiagram(manifest: ProjectManifest): string {
  const lines: string[] = ['graph LR'];

  // Style definitions
  lines.push('    classDef clientStyle fill:#3b82f6,stroke:#60a5fa,stroke-width:2px,color:#ffffff');
  lines.push('    classDef getStyle fill:#22c55e,stroke:#4ade80,stroke-width:1px,color:#ffffff');
  lines.push('    classDef postStyle fill:#3b82f6,stroke:#60a5fa,stroke-width:1px,color:#ffffff');
  lines.push('    classDef putStyle fill:#f59e0b,stroke:#fbbf24,stroke-width:1px,color:#ffffff');
  lines.push('    classDef deleteStyle fill:#ef4444,stroke:#f87171,stroke-width:1px,color:#ffffff');
  lines.push('');

  lines.push('    client["🌐 Client"]:::clientStyle');
  lines.push('');

  // Group by tags
  const tagGroups = new Map<string, typeof manifest.apiEndpoints>();
  for (const ep of manifest.apiEndpoints) {
    const tag = ep.tags[0] || 'default';
    if (!tagGroups.has(tag)) tagGroups.set(tag, []);
    tagGroups.get(tag)!.push(ep);
  }

  for (const [tag, endpoints] of tagGroups) {
    lines.push(`    subgraph ${sanitizeId(tag)}["${tag}"]`);
    for (const ep of endpoints.slice(0, 8)) { // Limit to 8 per group
      const id = sanitizeId(`${ep.method}_${ep.path}`);
      const methodStyle = `${ep.method.toLowerCase()}Style`;
      lines.push(`        ${id}["${ep.method} ${ep.path}"]:::${methodStyle}`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Connect client to endpoint groups
  for (const tag of tagGroups.keys()) {
    const firstEp = tagGroups.get(tag)![0];
    const firstId = sanitizeId(`${firstEp.method}_${firstEp.path}`);
    lines.push(`    client --> ${firstId}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate a dependency graph Mermaid diagram.
 */
function generateDependencyDiagram(manifest: ProjectManifest): string {
  const lines: string[] = ['graph TD'];

  lines.push('    classDef prodDep fill:#22c55e,stroke:#4ade80,stroke-width:1px,color:#ffffff');
  lines.push('    classDef devDep fill:#6366f1,stroke:#818cf8,stroke-width:1px,color:#ffffff');
  lines.push('    classDef projectStyle fill:#7c3aed,stroke:#a78bfa,stroke-width:2px,color:#ffffff');
  lines.push('');

  const projectId = sanitizeId(manifest.project.name || 'project');
  lines.push(`    ${projectId}["${manifest.project.name || 'Project'}"]:::projectStyle`);
  lines.push('');

  // Production dependencies (limit to top 12)
  const prodDeps = manifest.dependencies
    .filter(d => d.type === 'production')
    .slice(0, 12);

  if (prodDeps.length > 0) {
    lines.push('    subgraph prod["Production"]');
    for (const dep of prodDeps) {
      const id = sanitizeId(dep.name);
      lines.push(`        ${id}["${dep.name}"]:::prodDep`);
      lines.push(`        ${projectId} --> ${id}`);
    }
    lines.push('    end');
  }

  // Dev dependencies (limit to top 8)
  const devDeps = manifest.dependencies
    .filter(d => d.type === 'development')
    .slice(0, 8);

  if (devDeps.length > 0) {
    lines.push('    subgraph dev["Development"]');
    for (const dep of devDeps) {
      const id = sanitizeId(dep.name);
      lines.push(`        ${id}["${dep.name}"]:::devDep`);
      lines.push(`        ${projectId} -.-> ${id}`);
    }
    lines.push('    end');
  }

  return lines.join('\n') + '\n';
}

/**
 * Render a Mermaid file to SVG using @mermaid-js/mermaid-cli.
 */
async function renderMermaidToSVG(
  rootDir: string,
  relativeMermaidPath: string,
): Promise<GeneratedFile | null> {
  const absMermaidPath = join(rootDir, relativeMermaidPath);
  const relativeSvgPath = relativeMermaidPath.replace(/\.mermaid$/, '.svg');
  const absSvgPath = join(rootDir, relativeSvgPath);

  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    // `execFile` (no shell) keeps paths containing spaces or shell characters
    // from being re-parsed. mermaid-cli is fetched on demand rather than
    // installed: it pulls a full Chromium, which most users never need.
    await execFileAsync(
      'npx',
      [
        '-y',
        '@mermaid-js/mermaid-cli',
        'mmdc',
        '-i', absMermaidPath,
        '-o', absSvgPath,
        '-t', 'dark',
        '-b', 'transparent',
      ],
      { timeout: 120_000, shell: process.platform === 'win32' },
    );

    const { stat } = await import('node:fs/promises');
    const stats = await stat(absSvgPath);

    logger.success(`Rendered SVG: ${relativeSvgPath}`);
    return {
      // Repo-relative, matching every other entry in the returned list.
      path: relativeSvgPath,
      size: stats.size,
      type: 'svg',
    };
  } catch (err) {
    logger.warn(
      `Skipped SVG render for ${relativeMermaidPath} ` +
        `(the .mermaid source was still written).`,
    );
    logger.debug(String(err));
    return null;
  }
}

/**
 * Sanitize a string for use as a Mermaid node ID.
 */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'node';
}

export default generateDiagrams;
