/**
 * devsetgo — Playground Template Engine
 *
 * Generates the complete interactive playground HTML with embedded
 * code editor, WASM runtime, and premium dark-mode UI.
 */

import type { DevSetGoConfig, ProjectManifest } from '../parser/types.js';
import type { CompiledSnippet } from './wasm-compiler.js';
import { generateAPIExplorerHTML, generateAPIClientScript } from './api-playground.js';

/**
 * Generate the complete playground HTML page.
 */
export function renderPlaygroundHTML(
  manifest: ProjectManifest,
  config: DevSetGoConfig,
  compiledSnippets: CompiledSnippet[],
  css: string,
  js: string,
): string {
  const hasAPI = manifest.apiEndpoints.length > 0;
  const hasCode = compiledSnippets.length > 0;

  // Group snippets by category
  const categories = new Map<string, CompiledSnippet[]>();
  for (const snippet of compiledSnippets) {
    const cat = snippet.category || 'examples';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(snippet);
  }

  const apiExplorerHTML = hasAPI
    ? generateAPIExplorerHTML(manifest.apiEndpoints, config.playground.api_base_url || '')
    : '';

  const apiClientScript = hasAPI
    ? generateAPIClientScript(config.playground.api_base_url || '')
    : '';

  return `<!DOCTYPE html>
<html lang="en" data-theme="${config.playground.theme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.playground.title)} — ${escapeHtml(config.project.name)}</title>
  <meta name="description" content="Interactive playground for ${escapeHtml(config.project.name)}. Run code directly in your browser via WebAssembly." />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>${css}</style>
</head>
<body>

  <!-- Header -->
  <header class="header">
    <div class="header__brand">
      <span class="header__logo">▶</span>
      <span class="header__title">${escapeHtml(config.project.name)}</span>
      <span class="header__badge">Playground</span>
    </div>
    <nav class="header__nav">
      ${hasCode ? '<button class="tab tab--active" data-tab="code" onclick="switchTab(\'code\')">Code</button>' : ''}
      ${hasAPI ? '<button class="tab" data-tab="api" onclick="switchTab(\'api\')">API Explorer</button>' : ''}
      <a href="${escapeHtml(config.project.repo)}" class="header__link" target="_blank" rel="noopener">
        GitHub ↗
      </a>
    </nav>
    <div class="header__actions">
      <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">
        <span class="theme-toggle__icon">◑</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="main">
    ${hasCode ? generateCodePanel(categories, compiledSnippets[0]) : ''}
    ${hasAPI ? `<div class="tab-content" data-content="api" style="display:none;">${apiExplorerHTML}</div>` : ''}
  </main>

  <!-- Status Bar -->
  <footer class="statusbar">
    <span class="statusbar__item">
      <span class="statusbar__dot statusbar__dot--ready"></span>
      QuickJS WASM Runtime
    </span>
    <span class="statusbar__item">${compiledSnippets.length} snippets</span>
    ${hasAPI ? `<span class="statusbar__item">${manifest.apiEndpoints.length} API endpoints</span>` : ''}
    <span class="statusbar__item statusbar__item--right">
      Powered by <strong>devsetgo</strong>
    </span>
  </footer>

  <!-- Snippet Data -->
  <script type="application/json" id="snippets-data">
    ${JSON.stringify(compiledSnippets.map((s) => ({ id: s.id, title: s.title, code: s.code, description: s.description })))}
  </script>

  <!-- Runtime -->
  <script type="module">${js}</script>
  ${hasAPI ? `<script>${apiClientScript}</script>` : ''}
</body>
</html>`;
}

/**
 * Generate the code editor panel.
 */
function generateCodePanel(
  categories: Map<string, CompiledSnippet[]>,
  firstSnippet?: CompiledSnippet,
): string {
  const sidebarItems = generateCodeSidebar(categories);

  return `
  <div class="tab-content tab-content--active" data-content="code">
    <div class="editor-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar__search">
          <input type="text" class="sidebar__search-input" placeholder="Search snippets..."
                 oninput="filterSnippets(this.value)" />
        </div>
        ${sidebarItems}
      </aside>

      <!-- Editor + Output -->
      <div class="editor-pane">
        <!-- Editor Header -->
        <div class="editor-header">
          <span class="editor-header__title" id="snippet-title">${firstSnippet ? escapeHtml(firstSnippet.title) : 'Select a snippet'}</span>
          <div class="editor-header__actions">
            <button class="btn btn--small btn--ghost" onclick="resetCode()" title="Reset code">
              ↺ Reset
            </button>
            <button class="btn btn--small btn--primary" onclick="runCode()" title="Run code (Ctrl+Enter)">
              ▶ Run
            </button>
          </div>
        </div>

        <!-- Code Editor -->
        <div class="editor" id="code-editor">
          <textarea id="code-input" class="editor__textarea" spellcheck="false">${firstSnippet ? escapeHtml(firstSnippet.code) : '// Select a snippet from the sidebar'}</textarea>
        </div>

        <!-- Output Panel -->
        <div class="output" id="output-panel">
          <div class="output__header">
            <span class="output__title">Output</span>
            <button class="btn btn--tiny btn--ghost" onclick="clearOutput()">Clear</button>
          </div>
          <div class="output__content" id="output-content">
            <span class="output__placeholder">Run code to see output here...</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Generate the code snippet sidebar.
 */
function generateCodeSidebar(categories: Map<string, CompiledSnippet[]>): string {
  let html = '';

  for (const [category, snippets] of categories) {
    html += `
    <div class="sidebar__group">
      <h4 class="sidebar__group-title">${escapeHtml(category)}</h4>
      ${snippets
        .map(
          (s, i) => `
        <button class="sidebar__item ${i === 0 ? 'sidebar__item--active' : ''}"
                data-snippet-id="${escapeHtml(s.id)}"
                onclick="loadSnippet('${escapeHtml(s.id)}')">
          <span class="sidebar__item-icon">⟩</span>
          <span class="sidebar__item-title">${escapeHtml(s.title)}</span>
        </button>
      `,
        )
        .join('')}
    </div>`;
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default renderPlaygroundHTML;
