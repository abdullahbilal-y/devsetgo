/**
 * devsetgo — Serve Path Resolution Tests
 *
 * The dev server maps request URLs onto disk. These tests pin the containment
 * rules so a traversal cannot escape the playground directory.
 */

import { describe, it, expect } from 'vitest';
import { join, sep } from 'node:path';
import { resolveRequestPath } from '../../src/commands/serve.js';

const ROOT = join(sep, 'site', 'play');

describe('resolveRequestPath', () => {
  it('maps / to index.html', () => {
    expect(resolveRequestPath(ROOT, '/')).toBe(join(ROOT, 'index.html'));
  });

  it('maps a nested path inside the root', () => {
    expect(resolveRequestPath(ROOT, '/assets/app.css')).toBe(join(ROOT, 'assets', 'app.css'));
  });

  it('strips a query string before resolving', () => {
    expect(resolveRequestPath(ROOT, '/app.js?v=123')).toBe(join(ROOT, 'app.js'));
  });

  it('strips a fragment before resolving', () => {
    expect(resolveRequestPath(ROOT, '/index.html#section')).toBe(join(ROOT, 'index.html'));
  });

  it('decodes percent-escapes so real filenames resolve', () => {
    expect(resolveRequestPath(ROOT, '/my%20file.txt')).toBe(join(ROOT, 'my file.txt'));
  });

  it('rejects a plain traversal', () => {
    expect(resolveRequestPath(ROOT, '/../../etc/passwd')).toBeNull();
  });

  it('rejects a percent-encoded traversal', () => {
    // Without decoding, `%2e%2e` would slip past the containment check.
    expect(resolveRequestPath(ROOT, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
  });

  it('rejects a sibling directory sharing the root prefix', () => {
    // The bug a bare `startsWith(root)` allows: /site/play-secret begins with
    // /site/play, so it passed the old check.
    expect(resolveRequestPath(ROOT, '/../play-secret/creds.env')).toBeNull();
  });

  it('rejects a NUL byte in the path', () => {
    expect(resolveRequestPath(ROOT, '/index.html%00.png')).toBeNull();
  });

  it('rejects malformed percent-encoding instead of throwing', () => {
    expect(resolveRequestPath(ROOT, '/%')).toBeNull();
  });

  it('allows a nested path that merely contains dots', () => {
    expect(resolveRequestPath(ROOT, '/js/app.min.js')).toBe(join(ROOT, 'js', 'app.min.js'));
  });
});
