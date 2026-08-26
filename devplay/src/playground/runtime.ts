/**
 * devplay — Playground Client-Side Runtime
 *
 * Browser-side JavaScript that manages code execution,
 * snippet loading, theme toggling, and tab switching.
 */

export const PLAYGROUND_JS = `
/**
 * devplay Playground Runtime
 */

// ── State ─────────────────────────────────────────────────────────

let snippets = [];
let currentSnippetId = null;
let originalCode = {};

// ── Initialization ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Load snippet data
  const dataEl = document.getElementById('snippets-data');
  if (dataEl) {
    try {
      snippets = JSON.parse(dataEl.textContent);
      for (const s of snippets) {
        originalCode[s.id] = s.code;
      }
      if (snippets.length > 0) {
        currentSnippetId = snippets[0].id;
      }
    } catch (e) {
      console.error('Failed to load snippets:', e);
    }
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to run code
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }

    // Ctrl/Cmd + S to prevent save dialog
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
    }
  });

  // Tab support in textarea
  const textarea = document.getElementById('code-input');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    });
  }

  // Initialize WASM runtime
  initWASMRuntime();
});

// ── WASM Runtime ──────────────────────────────────────────────────

let wasmReady = false;
let quickJS = null;

async function initWASMRuntime() {
  try {
    // Dynamically import QuickJS
    const { getQuickJS } = await import('https://esm.sh/quickjs-emscripten@0.31.0');
    quickJS = await getQuickJS();
    wasmReady = true;
    updateStatus('ready');
  } catch (err) {
    console.error('Failed to initialize WASM runtime:', err);
    updateStatus('error');
  }
}

function updateStatus(status) {
  const dot = document.querySelector('.statusbar__dot');
  if (dot) {
    dot.className = 'statusbar__dot';
    if (status === 'ready') dot.classList.add('statusbar__dot--ready');
  }
}

// ── Code Execution ────────────────────────────────────────────────

async function runCode() {
  if (!wasmReady) {
    appendOutput('WASM runtime is still loading...', 'error');
    return;
  }

  const textarea = document.getElementById('code-input');
  const code = textarea.value;

  clearOutput();
  appendOutput('Running...', 'info');

  const startTime = performance.now();

  try {
    const vm = quickJS.newContext();
    const output = [];

    // Set up console
    const logFn = vm.newFunction('log', (...args) => {
      const parts = args.map(arg => {
        if (typeof vm.dump === 'function') return JSON.stringify(vm.dump(arg));
        return vm.getString(arg);
      });
      output.push(parts.join(' '));
    });

    const consoleObj = vm.newObject();
    vm.setProp(consoleObj, 'log', logFn);
    vm.setProp(consoleObj, 'info', logFn);
    vm.setProp(consoleObj, 'warn', logFn);
    vm.setProp(consoleObj, 'error', logFn);
    vm.setProp(vm.global, 'console', consoleObj);

    logFn.dispose();
    consoleObj.dispose();

    // Execute
    const result = vm.evalCode(code);
    const duration = performance.now() - startTime;

    clearOutput();

    if (result.error) {
      const errorMsg = vm.dump(result.error);
      result.error.dispose();
      appendOutput(String(errorMsg), 'error');
    } else {
      // Show captured output
      for (const line of output) {
        appendOutput(line, 'success');
      }

      // Show return value
      const val = vm.dump(result.value);
      result.value.dispose();
      if (val !== undefined && output.length === 0) {
        appendOutput(JSON.stringify(val, null, 2), 'success');
      }
    }

    appendDuration(duration);
    vm.dispose();
  } catch (err) {
    clearOutput();
    appendOutput('Execution error: ' + err.message, 'error');
    appendDuration(performance.now() - startTime);
  }
}

// Make global
window.runCode = runCode;

// ── Snippet Management ────────────────────────────────────────────

function loadSnippet(id) {
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;

  currentSnippetId = id;

  // Update textarea
  const textarea = document.getElementById('code-input');
  textarea.value = snippet.code;

  // Update title
  const titleEl = document.getElementById('snippet-title');
  titleEl.textContent = snippet.title;

  // Update sidebar active state
  document.querySelectorAll('.sidebar__item').forEach(item => {
    item.classList.toggle('sidebar__item--active', item.dataset.snippetId === id);
  });

  clearOutput();
}

window.loadSnippet = loadSnippet;

function resetCode() {
  if (currentSnippetId && originalCode[currentSnippetId]) {
    const textarea = document.getElementById('code-input');
    textarea.value = originalCode[currentSnippetId];
    clearOutput();
  }
}

window.resetCode = resetCode;

function filterSnippets(query) {
  const lower = query.toLowerCase();
  document.querySelectorAll('.sidebar__item').forEach(item => {
    const title = item.querySelector('.sidebar__item-title');
    if (title) {
      const match = title.textContent.toLowerCase().includes(lower);
      item.style.display = match ? '' : 'none';
    }
  });
}

window.filterSnippets = filterSnippets;

// ── Output Management ─────────────────────────────────────────────

function clearOutput() {
  const content = document.getElementById('output-content');
  if (content) content.innerHTML = '';
}

window.clearOutput = clearOutput;

function appendOutput(text, type) {
  const content = document.getElementById('output-content');
  if (!content) return;

  const line = document.createElement('div');
  line.className = 'output__line';
  if (type === 'error') line.classList.add('output__line--error');
  if (type === 'success') line.classList.add('output__line--success');
  line.textContent = text;
  content.appendChild(line);

  content.scrollTop = content.scrollHeight;
}

function appendDuration(ms) {
  const content = document.getElementById('output-content');
  if (!content) return;

  const el = document.createElement('span');
  el.className = 'output__duration';
  el.textContent = 'Executed in ' + ms.toFixed(1) + 'ms';
  content.appendChild(el);
}

// ── Tab Switching ─────────────────────────────────────────────────

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('tab--active', t.dataset.tab === tabName);
  });

  // Update content panels
  document.querySelectorAll('.tab-content').forEach(p => {
    const isActive = p.dataset.content === tabName;
    p.style.display = isActive ? 'block' : 'none';
    p.classList.toggle('tab-content--active', isActive);
  });
}

window.switchTab = switchTab;

// ── Theme Toggle ──────────────────────────────────────────────────

function toggleTheme() {
  const html = document.documentElement;
  const current = html.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;

  // Persist preference
  try { localStorage.setItem('devplay-theme', next); } catch {}
}

window.toggleTheme = toggleTheme;

// Restore saved theme
try {
  const saved = localStorage.getItem('devplay-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch {}
`;

export default PLAYGROUND_JS;
