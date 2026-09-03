/**
 * devsetgo — Template Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { renderPlaygroundHTML } from '../../src/playground/template-engine.js';
import { PLAYGROUND_CSS } from '../../src/playground/styles.js';
import { PLAYGROUND_JS } from '../../src/playground/runtime.js';
import type { DevSetGoConfig, ProjectManifest } from '../../src/parser/types.js';
import type { CompiledSnippet } from '../../src/playground/wasm-compiler.js';

const testConfig: DevSetGoConfig = {
  project: {
    name: 'test-tool',
    description: 'Test tool description',
    repo: 'https://github.com/test-org/test-tool',
    version: '1.0.0',
  },
  playground: {
    theme: 'dark',
    title: 'Test Playground',
    languages: ['javascript'],
    api_base_url: 'https://api.example.com',
    output_dir: '.devsetgo/playground',
  },
  readme: {
    cro_enabled: true,
    output: 'README.md',
    format: 'github',
    hero: { tagline: 'Test tagline', badges: [] },
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
    output_dir: 'assets',
    diagrams: { enabled: true, format: 'all', auto_detect: true },
    social_cards: {
      enabled: true,
      theme: 'dark',
      sizes: [{ name: 'og', width: 1200, height: 630 }],
    },
  },
};

const testManifest: ProjectManifest = {
  project: testConfig.project,
  codeSnippets: [],
  apiEndpoints: [
    {
      method: 'GET',
      path: '/users',
      summary: 'List users',
      description: 'Returns all users',
      tags: ['users'],
      parameters: [],
      responses: { '200': { description: 'Success' } },
    },
  ],
  docSections: [],
  modules: [],
  dependencies: [],
};

const testSnippets: CompiledSnippet[] = [
  {
    id: 'test_greet',
    title: 'Greet',
    description: 'A greeting function',
    code: 'console.log("Hello!")',
    language: 'javascript',
    category: 'basics',
    runnable: true,
  },
];

describe('Template Engine', () => {
  describe('renderPlaygroundHTML', () => {
    it('should produce a valid HTML string', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include the project name in the title', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('test-tool');
    });

    it('should include the playground title', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('Test Playground');
    });

    it('should include the snippet code in the editor', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('console.log');
    });

    it('should include the CSS', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('<style>');
      expect(html).toContain('--accent');
    });

    it('should include the JS runtime', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('<script');
      expect(html).toContain('runCode');
    });

    it('should show API explorer tab when endpoints exist', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('API Explorer');
    });

    it('should show code tab when snippets exist', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('Code');
    });

    it('should embed snippet data as JSON', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('snippets-data');
      expect(html).toContain('test_greet');
    });

    it('should use the configured theme', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('data-theme="dark"');
    });

    it('should include the GitHub repo link', () => {
      const html = renderPlaygroundHTML(
        testManifest,
        testConfig,
        testSnippets,
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      expect(html).toContain('github.com/test-org/test-tool');
    });

    it('should handle empty snippets gracefully', () => {
      const html = renderPlaygroundHTML(
        { ...testManifest, apiEndpoints: [] },
        testConfig,
        [],
        PLAYGROUND_CSS,
        PLAYGROUND_JS,
      );
      // Should still produce valid HTML even without any content
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});
