/**
 * devsetgo — Playground Client-Side Runtime
 *
 * Browser-side JavaScript that manages code execution,
 * snippet loading, theme toggling, and tab switching.
 */

export const PLAYGROUND_JS = `
/**
 * devsetgo Playground Runtime
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

/** Wall-clock budget for a single snippet run, in milliseconds. */
const EXECUTION_TIMEOUT_MS = 5000;

/**
 * QuickJS sources, tried in order.
 *
 * A single hardcoded CDN meant one provider outage took every published
 * playground offline. Each entry is version-pinned so a CDN cannot silently
 * serve a different build. window.__DEVSETGO_QUICKJS_SOURCES__ (set by the
 * generated page from config) takes precedence when present.
 */
const QUICKJS_SOURCES =
  (typeof window !== 'undefined' && window.__DEVSETGO_QUICKJS_SOURCES__) || [
    'https://esm.sh/quickjs-emscripten@0.31.0',
    'https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.31.0/+esm',
    'https://unpkg.com/quickjs-emscripten@0.31.0?module',
  ];

async function initWASMRuntime() {
  updateStatus('loading');

  const failures = [];

  for (const source of QUICKJS_SOURCES) {
    try {
      const mod = await import(/* @vite-ignore */ source);
      const getQuickJS = mod.getQuickJS || (mod.default && mod.default.getQuickJS);

      if (typeof getQuickJS !== 'function') {
        throw new Error('module did not export getQuickJS');
      }

      quickJS = await getQuickJS();
      wasmReady = true;
      updateStatus('ready');
      return;
    } catch (err) {
      failures.push(source + ': ' + (err && err.message ? err.message : String(err)));
      console.warn('[devsetgo] QuickJS source failed, trying next:', source, err);
    }
  }

  console.error('[devsetgo] All QuickJS sources failed:', failures);
  updateStatus('error');

  // Say what went wrong in the pane the reader is already looking at, rather
  // than silently leaving a dead Run button.
  appendOutput(
    'Could not load the JavaScript sandbox. All ' +
      QUICKJS_SOURCES.length +
      ' sources failed — this is usually a network, proxy, or offline issue.',
    'error'
  );
  for (const failure of failures) {
    appendOutput('  • ' + failure, 'error');
  }
}

const STATUS_LABELS = {
  loading: 'Loading QuickJS WASM Runtime…',
  ready: 'QuickJS WASM Runtime',
  error: 'Runtime unavailable',
};

function updateStatus(status) {
  const dot = document.querySelector('.statusbar__dot');
  if (dot) {
    dot.className = 'statusbar__dot';
    if (status === 'ready') dot.classList.add('statusbar__dot--ready');
    if (status === 'error') dot.classList.add('statusbar__dot--error');
  }

  const label = document.querySelector('.statusbar__runtime-label');
  if (label && STATUS_LABELS[status]) {
    label.textContent = STATUS_LABELS[status];
  }

  const runButton = document.getElementById('run-button');
  if (runButton) {
    runButton.disabled = status !== 'ready';
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
        try {
          const val = vm.dump(arg);
          if (typeof val === 'string') return val;
          if (val === undefined) return 'undefined';
          if (val === null) return 'null';
          return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
        } catch {
          return vm.getString(arg);
        }
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

    // Pre-process code for eval: strip export keywords. The backslashes are
    // doubled because this source sits inside a template literal.
    let evalCodeStr = code
      .replace(/^[ \\t]*export\\s+default\\s+/gm, '')
      .replace(/^[ \\t]*export\\s+/gm, '');

    // Auto-invoke a top-level function that nothing calls, so that editing in
    // a new definition still produces output. The existing-call check must be
    // anchored at column zero: searching the whole source would treat a
    // recursive call inside the body as an invocation and stay silent.
    const funcMatch = evalCodeStr.match(/^(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)\\s*\\(/m);
    if (funcMatch) {
      const fnName = funcMatch[1];
      const withoutDecl = evalCodeStr.replace(
        /^(?:async\\s+)?function\\s+[A-Za-z_$][\\w$]*\\s*\\(/gm,
        ''
      );
      const called = new RegExp('^(?:await\\\\s+|void\\\\s+)?' + fnName + '\\\\s*\\\\(', 'm');
      if (!called.test(withoutDecl)) {
        evalCodeStr += '\\n\\n' + fnName + '();';
      }
    }

    // Stop runaway snippets instead of freezing the tab. QuickJS invokes this
    // between operations; returning true aborts the run with an interrupt.
    const deadline = Date.now() + EXECUTION_TIMEOUT_MS;
    vm.runtime.setInterruptHandler(() => Date.now() > deadline);

    // Execute
    const result = vm.evalCode(evalCodeStr);
    const duration = performance.now() - startTime;

    clearOutput();

    if (result.error) {
      const errObj = vm.dump(result.error);
      result.error.dispose();
      let errorText = 'Runtime Error';
      if (typeof errObj === 'string') {
        errorText = errObj;
      } else if (errObj && typeof errObj === 'object') {
        errorText = (errObj.name || 'Error') + ': ' + (errObj.message || JSON.stringify(errObj));
      }
      appendOutput(errorText, 'error');
    } else {
      // Show captured output
      for (const line of output) {
        appendOutput(line, 'success');
      }

      // Show return value if non-empty
      const val = vm.dump(result.value);
      result.value.dispose();
      if (val !== undefined && output.length === 0) {
        const formatted = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
        appendOutput(formatted, 'success');
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
  try { localStorage.setItem('devsetgo-theme', next); } catch {}
}

window.toggleTheme = toggleTheme;

// Restore saved theme
try {
  const saved = localStorage.getItem('devsetgo-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch {}
`;

export default PLAYGROUND_JS;
