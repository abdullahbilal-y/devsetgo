/**
 * devsetgo — Playground CSS
 *
 * Premium dark-mode-first design system with glassmorphism,
 * gradients, and micro-animations.
 */

export const PLAYGROUND_CSS = `
/* ── Design Tokens ─────────────────────────────────────────────── */

:root {
  /* Surface Colors */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a2e;
  --bg-elevated: #1e1e32;
  --bg-glass: rgba(30, 30, 50, 0.7);
  --bg-hover: rgba(124, 58, 237, 0.08);

  /* Text Colors */
  --text-primary: #e8e8f0;
  --text-secondary: #9898b0;
  --text-muted: #5a5a78;
  --text-accent: #a78bfa;

  /* Brand Colors */
  --accent: #7c3aed;
  --accent-light: #a78bfa;
  --accent-dark: #5b21b6;
  --accent-glow: rgba(124, 58, 237, 0.3);

  /* Semantic Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* API Method Colors */
  --method-get: #22c55e;
  --method-post: #3b82f6;
  --method-put: #f59e0b;
  --method-patch: #f97316;
  --method-delete: #ef4444;

  /* Border & Elevation */
  --border: rgba(255, 255, 255, 0.06);
  --border-active: rgba(124, 58, 237, 0.4);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(124, 58, 237, 0.15);

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-lg: 1rem;
  --text-xl: 1.25rem;

  /* Layout */
  --header-height: 52px;
  --statusbar-height: 28px;
  --sidebar-width: 260px;

  /* Animations */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 150ms var(--ease-out);
  --transition-normal: 250ms var(--ease-out);
}

/* Light Theme */
[data-theme="light"] {
  --bg-primary: #fafafa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f0f0f5;
  --bg-elevated: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.85);
  --bg-hover: rgba(124, 58, 237, 0.05);
  --text-primary: #1a1a2e;
  --text-secondary: #4a4a68;
  --text-muted: #8a8aa8;
  --border: rgba(0, 0, 0, 0.08);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ── Reset & Base ──────────────────────────────────────────────── */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: var(--font-sans);
  font-size: 16px;
  color: var(--text-primary);
  background: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

body {
  display: flex;
  flex-direction: column;
}

/* ── Header ────────────────────────────────────────────────────── */

.header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(16px);
  z-index: 100;
  gap: var(--space-md);
}

.header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.header__logo {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  border-radius: 8px;
  font-size: var(--text-sm);
  color: white;
  font-weight: 700;
}

.header__title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.header__badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--accent-glow);
  color: var(--accent-light);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex: 1;
  margin-left: var(--space-lg);
}

.header__link {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  padding: var(--space-xs) var(--space-sm);
  border-radius: 6px;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.header__link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* ── Tabs ──────────────────────────────────────────────────────── */

.tab {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  padding: var(--space-xs) var(--space-md);
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab--active {
  color: var(--accent-light);
  background: var(--accent-glow);
}

.tab--active::after {
  content: '';
  position: absolute;
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
}

/* ── Theme Toggle ──────────────────────────────────────────────── */

.theme-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-lg);
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  color: var(--accent-light);
  border-color: var(--border-active);
  box-shadow: var(--shadow-glow);
}

/* ── Main Layout ───────────────────────────────────────────────── */

.main {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  display: none;
}

.tab-content--active {
  display: block;
}

/* ── Editor Layout ─────────────────────────────────────────────── */

.editor-layout {
  display: flex;
  height: calc(100vh - var(--header-height) - var(--statusbar-height));
}

/* ── Sidebar ───────────────────────────────────────────────────── */

.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar__search {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--border);
}

.sidebar__search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.sidebar__search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.sidebar__search-input::placeholder {
  color: var(--text-muted);
}

.sidebar__group {
  padding: var(--space-sm) 0;
}

.sidebar__group-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-xs) var(--space-md);
  margin-bottom: var(--space-xs);
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
  border-left: 2px solid transparent;
}

.sidebar__item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.sidebar__item--active {
  color: var(--accent-light);
  background: var(--accent-glow);
  border-left-color: var(--accent);
}

.sidebar__item-icon {
  font-size: var(--text-xs);
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.sidebar__item--active .sidebar__item-icon {
  color: var(--accent);
  transform: rotate(90deg);
}

/* ── Editor ────────────────────────────────────────────────────── */

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.editor-header__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.editor-header__actions {
  display: flex;
  gap: var(--space-sm);
}

.editor {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.editor__textarea {
  width: 100%;
  height: 100%;
  padding: var(--space-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
  border: none;
  outline: none;
  resize: none;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

.editor__textarea::selection {
  background: rgba(124, 58, 237, 0.3);
}

/* ── Output Panel ──────────────────────────────────────────────── */

.output {
  height: 200px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.output__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-md);
  border-bottom: 1px solid var(--border);
}

.output__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.output__content {
  flex: 1;
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  overflow-y: auto;
  color: var(--text-primary);
}

.output__placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.output__line {
  padding: 1px 0;
}

.output__line--error {
  color: var(--error);
}

.output__line--success {
  color: var(--success);
}

.output__duration {
  display: inline-block;
  margin-top: var(--space-sm);
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* ── Buttons ───────────────────────────────────────────────────── */

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-sans);
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn--primary {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  color: white;
  box-shadow: 0 2px 8px var(--accent-glow);
}

.btn--primary:hover {
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
  transform: translateY(-1px);
}

.btn--primary:active {
  transform: translateY(0);
}

.btn--secondary {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn--secondary:hover {
  border-color: var(--border-active);
  background: var(--bg-elevated);
}

.btn--small {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-xs);
}

.btn--tiny {
  padding: 2px var(--space-sm);
  font-size: var(--text-xs);
}

.btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn--ghost:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  border-color: var(--border-active);
}

/* ── Status Bar ────────────────────────────────────────────────── */

.statusbar {
  height: var(--statusbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
  background: var(--accent-dark);
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-xs);
  gap: var(--space-md);
}

.statusbar__item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.statusbar__item--right {
  margin-left: auto;
}

.statusbar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.statusbar__dot--ready {
  background: var(--success);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── API Explorer ──────────────────────────────────────────────── */

.api-explorer {
  display: flex;
  height: 100%;
}

.api-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: var(--space-md) 0;
}

.api-sidebar__title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
  padding: 0 var(--space-md) var(--space-md);
}

.api-sidebar__group {
  margin-bottom: var(--space-md);
}

.api-sidebar__group-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-xs) var(--space-md);
}

.api-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  text-align: left;
  transition: all var(--transition-fast);
}

.api-sidebar__item:hover { background: var(--bg-hover); }
.api-sidebar__item.active { background: var(--accent-glow); border-left-color: var(--accent); }

.api-method {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.method--get { background: rgba(34, 197, 94, 0.15); color: var(--method-get); }
.method--post { background: rgba(59, 130, 246, 0.15); color: var(--method-post); }
.method--put { background: rgba(245, 158, 11, 0.15); color: var(--method-put); }
.method--patch { background: rgba(249, 115, 22, 0.15); color: var(--method-patch); }
.method--delete { background: rgba(239, 68, 68, 0.15); color: var(--method-delete); }

.api-method--large {
  font-size: var(--text-sm);
  padding: 4px 10px;
}

.api-path {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-content {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
}

.api-panel__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.api-panel__path {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: var(--space-xs) var(--space-md);
  border-radius: 6px;
}

.api-panel__description {
  font-size: var(--text-base);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.api-panel__detail {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

.api-panel__params,
.api-panel__body,
.api-panel__auth {
  margin-bottom: var(--space-lg);
}

.api-panel__params h4,
.api-panel__body h4,
.api-panel__auth h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.params-table {
  width: 100%;
  border-collapse: collapse;
}

.params-table th,
.params-table td {
  padding: var(--space-sm);
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}

.params-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.param-in {
  font-size: var(--text-xs);
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  color: var(--text-muted);
}

.required {
  color: var(--error);
  margin-left: 2px;
}

.content-type {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-left: var(--space-sm);
}

.input,
.code-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.input:focus,
.code-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.code-input {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.api-panel__actions {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.api-panel__response {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.api-response__placeholder {
  padding: var(--space-lg);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.response-status {
  font-weight: 600;
  font-size: var(--text-sm);
}

.status--success { color: var(--success); }
.status--error { color: var(--error); }

.response-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.response-body {
  padding: var(--space-md);
  overflow-x: auto;
}

.response-body code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--text-primary);
}

.error {
  color: var(--error);
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.loading {
  padding: var(--space-lg);
  text-align: center;
  color: var(--accent-light);
  animation: pulse 1.5s infinite;
}

/* ── Scrollbar ─────────────────────────────────────────────────── */

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* ── Responsive ────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .sidebar,
  .api-sidebar {
    width: 200px;
  }

  .header__badge {
    display: none;
  }
}

@media (max-width: 480px) {
  .sidebar,
  .api-sidebar {
    display: none;
  }

  .editor-layout {
    flex-direction: column;
  }
}
`;

export default PLAYGROUND_CSS;
