/**
 * devsetgo — Browser Runtime Tests
 *
 * The playground's client code is authored inside a TypeScript template
 * literal, which silently rewrites unrecognized escapes (`\s` becomes `s`).
 * These tests assert on the *emitted* string so a broken escape fails the
 * build instead of shipping a regex that cannot match.
 */

import { describe, it, expect } from 'vitest';
import { PLAYGROUND_JS } from '../../src/playground/runtime.js';

describe('Playground browser runtime', () => {
  it('emits syntactically valid JavaScript', () => {
    // `new Function` parses without executing — a syntax error throws here.
    expect(() => new Function(PLAYGROUND_JS)).not.toThrow();
  });

  it('emits regex escapes intact rather than collapsing them', () => {
    // The classic failure is `/^export\s+/` degrading to `/^exports+/`.
    expect(PLAYGROUND_JS).not.toMatch(/\/\^\[ \\t\]\*exports\+/);
    expect(PLAYGROUND_JS).toContain('export\\s+default');
    expect(PLAYGROUND_JS).toContain('export\\s+');
  });

  it('guards snippet execution with an interrupt handler', () => {
    // Without this, an infinite loop in a snippet hangs the viewer's tab.
    expect(PLAYGROUND_JS).toContain('setInterruptHandler');
    expect(PLAYGROUND_JS).toContain('EXECUTION_TIMEOUT_MS');
  });

  it('anchors the auto-invoke check so recursive demos still run', () => {
    expect(PLAYGROUND_JS).toContain('withoutDecl');
  });

  it('exposes the entry points the generated HTML calls', () => {
    for (const fn of ['runCode', 'switchTab', 'toggleTheme']) {
      expect(PLAYGROUND_JS).toContain(fn);
    }
  });
});
