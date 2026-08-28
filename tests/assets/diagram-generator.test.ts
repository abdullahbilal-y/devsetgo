/**
 * devsetgo — Diagram Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateDiagrams } from '../../src/assets/diagram-generator.js';
import type { DevSetGoConfig, ProjectManifest } from '../../src/parser/types.js';
import { resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const testConfig: DevSetGoConfig = {
  project: {
    name: 'test-tool',
    description: 'A test tool',
    repo: 'https://github.com/test-org/test-tool',
    version: '1.0.0',
  },
  playground: {
    theme: 'dark',
    title: 'Test Playground',
    languages: ['javascript'],
    output_dir: '.devsetgo/playground',
  },
  readme: {
    cro_enabled: true,
    output: 'README.md',
    format: 'github',
    hero: { tagline: 'Test', badges: [] },
    problem: '',
    solution: '',
    quick_start: { install_command: 'npm i test-tool', first_run: 'test-tool init' },
    features: [],
    metrics: [],
  },
  cta: {
    install: { command: 'npm i test-tool', label: 'Get Started' },
    enterprise: { enabled: false, url: '', label: '', description: '' },
  },
  assets: {
    output_dir: '.devsetgo-test-diagrams',
    diagrams: {
      enabled: true,
      format: 'mermaid', // Only mermaid — don't try SVG render in tests
      auto_detect: true,
    },
    social_cards: {
      enabled: false,
      theme: 'dark',
      sizes: [],
    },
  },
};

const testManifest: ProjectManifest = {
  project: testConfig.project,
  codeSnippets: [],
  apiEndpoints: [
    {
      method: 'GET',
      path: '/pets',
      summary: 'List pets',
      description: '',
      tags: ['pets'],
      parameters: [],
      responses: {},
    },
    {
      method: 'POST',
      path: '/pets',
      summary: 'Create pet',
      description: '',
      tags: ['pets'],
      parameters: [],
      responses: {},
    },
  ],
  docSections: [],
  modules: [
    { name: 'core', path: 'src/core', exports: ['init', 'run'], internalDependencies: ['utils'] },
    { name: 'utils', path: 'src/utils', exports: ['log', 'format'], internalDependencies: [] },
  ],
  dependencies: [
    { name: 'commander', version: '^13.0.0', type: 'production' },
    { name: 'typescript', version: '^5.7.0', type: 'development' },
  ],
};

const TMP_DIR = resolve(import.meta.dirname, '../../.devsetgo-test-diagrams');

describe('Diagram Generator', () => {
  afterAll(() => {
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  it('should generate mermaid files for modules', async () => {
    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), testManifest, testConfig);

    const mermaidFiles = files.filter(f => f.type === 'mermaid');
    expect(mermaidFiles.length).toBeGreaterThanOrEqual(1);

    const architectureFile = mermaidFiles.find(f => f.path.includes('architecture'));
    expect(architectureFile).toBeDefined();
  });

  it('should generate API flow diagram when endpoints exist', async () => {
    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), testManifest, testConfig);

    const apiFlowFile = files.find(f => f.path.includes('api-flow'));
    expect(apiFlowFile).toBeDefined();
  });

  it('should generate dependency diagram when dependencies exist', async () => {
    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), testManifest, testConfig);

    const depFile = files.find(f => f.path.includes('dependencies'));
    expect(depFile).toBeDefined();
  });

  it('should produce valid Mermaid syntax in generated files', async () => {
    const { readFileSync } = await import('node:fs');
    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), testManifest, testConfig);

    const architectureFile = files.find(f => f.path.includes('architecture') && f.type === 'mermaid');
    expect(architectureFile).toBeDefined();

    const mermaidPath = resolve(import.meta.dirname, '../..', architectureFile!.path);
    const content = readFileSync(mermaidPath, 'utf-8');

    // Mermaid diagrams start with a graph type declaration
    expect(content).toMatch(/^graph\s+(TB|TD|LR|RL)/);
    // Should contain module nodes
    expect(content).toContain('core');
    expect(content).toContain('utils');
  });

  it('should include dependency arrows for internal deps', async () => {
    const { readFileSync } = await import('node:fs');
    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), testManifest, testConfig);

    const architectureFile = files.find(f => f.path.includes('architecture') && f.type === 'mermaid');
    const mermaidPath = resolve(import.meta.dirname, '../..', architectureFile!.path);
    const content = readFileSync(mermaidPath, 'utf-8');

    // core --> utils dependency should be represented
    expect(content).toContain('-->');
  });

  it('should return files with size > 0', async () => {
    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), testManifest, testConfig);

    for (const file of files) {
      expect(file.size).toBeGreaterThan(0);
    }
  });

  it('should not generate diagrams if modules and endpoints are empty', async () => {
    const emptyManifest: ProjectManifest = {
      ...testManifest,
      modules: [],
      apiEndpoints: [],
      dependencies: [],
    };

    const files = await generateDiagrams(resolve(import.meta.dirname, '../..'), emptyManifest, testConfig);
    expect(files.length).toBe(0);
  });
});
