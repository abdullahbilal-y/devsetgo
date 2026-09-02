/**
 * devsetgo — Serve Integration Tests
 *
 * Drives the real server over a real socket. The unit tests cover path
 * resolution in isolation; these prove the handler is actually wired to it,
 * that the live-reload endpoint responds instead of double-writing the
 * response, and that the reload token only changes on a rebuild.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startPlaygroundServer, type PlaygroundServer } from '../../src/commands/serve.js';

let workDir: string;
let playgroundDir: string;
let server: PlaygroundServer;

const INDEX_HTML = '<!DOCTYPE html><html><body><h1>Playground</h1></body></html>';

/** Fetch a path off the running server without following redirects. */
async function get(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${server.url}${path}`, { ...init, redirect: 'manual' });
}

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'devsetgo-serve-'));
  playgroundDir = join(workDir, 'playground');
  await mkdir(playgroundDir, { recursive: true });

  await writeFile(join(playgroundDir, 'index.html'), INDEX_HTML, 'utf-8');
  await writeFile(join(playgroundDir, 'app.css'), 'body { color: red; }', 'utf-8');
  await writeFile(join(playgroundDir, 'snippets.json'), '{"ok":true}', 'utf-8');

  // Files the server must never expose: one above the root, and one in a
  // sibling directory whose name starts with the root's name.
  await writeFile(join(workDir, 'secret.txt'), 'TOP SECRET', 'utf-8');
  await mkdir(join(workDir, 'playground-secret'), { recursive: true });
  await writeFile(join(workDir, 'playground-secret', 'creds.env'), 'KEY=abc123', 'utf-8');

  // Port 0 lets the OS pick a free port, so the suite never collides with
  // whatever else is listening on the machine.
  server = await startPlaygroundServer(playgroundDir, 0);
});

afterAll(async () => {
  await server?.close();
  await rm(workDir, { recursive: true, force: true });
});

describe('serve integration', () => {
  it('serves index.html at the root', async () => {
    const res = await get('/');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('<h1>Playground</h1>');
  });

  it('injects the live-reload script into HTML', async () => {
    expect(await (await get('/')).text()).toContain('__devsetgo_ping');
  });

  it('serves static assets with the right content type', async () => {
    const css = await get('/app.css');
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toContain('text/css');

    const json = await get('/snippets.json');
    expect(json.headers.get('content-type')).toContain('application/json');
    expect(await json.json()).toEqual({ ok: true });
  });

  it('serves a file requested with a query string', async () => {
    const res = await get('/app.css?v=12345');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('color: red');
  });

  it('falls back to index.html for unknown routes', async () => {
    const res = await get('/some/spa/route');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<h1>Playground</h1>');
  });

  it('answers the live-reload ping with a token', async () => {
    // In 1.x this endpoint was a second request listener and threw
    // ERR_HTTP_HEADERS_SENT, taking the server down.
    const res = await get('/__devsetgo_ping');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(typeof body.token).toBe('string');
  });

  it('keeps the reload token stable when nothing changes', async () => {
    // The old implementation returned Date.now(), so every poll looked like a
    // rebuild and the page reloaded every 1.5 seconds forever.
    const first = (await (await get('/__devsetgo_ping')).json()) as { token: string };
    await new Promise((r) => setTimeout(r, 50));
    const second = (await (await get('/__devsetgo_ping')).json()) as { token: string };

    expect(second.token).toBe(first.token);
  });

  it('changes the reload token when index.html is rewritten', async () => {
    const before = (await (await get('/__devsetgo_ping')).json()) as { token: string };

    await new Promise((r) => setTimeout(r, 20));
    await writeFile(join(playgroundDir, 'index.html'), `${INDEX_HTML}<!-- rebuilt -->`, 'utf-8');

    const after = (await (await get('/__devsetgo_ping')).json()) as { token: string };
    expect(after.token).not.toBe(before.token);

    await writeFile(join(playgroundDir, 'index.html'), INDEX_HTML, 'utf-8');
  });

  it('refuses a traversal that escapes the playground root', async () => {
    const res = await fetch(`${server.url}/../secret.txt`, { redirect: 'manual' });
    expect(await res.text()).not.toContain('TOP SECRET');
  });

  it('refuses a sibling directory sharing the root prefix', async () => {
    // The specific hole a bare startsWith(root) leaves open.
    const res = await fetch(`${server.url}/../playground-secret/creds.env`, {
      redirect: 'manual',
    });
    expect(await res.text()).not.toContain('KEY=abc123');
  });

  it('refuses a percent-encoded traversal', async () => {
    const res = await get('/%2e%2e/secret.txt');
    expect(await res.text()).not.toContain('TOP SECRET');
  });

  it('rejects non-GET methods', async () => {
    const res = await get('/', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toContain('GET');
  });

  it('answers HEAD with headers and no body', async () => {
    const res = await get('/', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('reports a real bound port when asked for port 0', () => {
    expect(server.port).toBeGreaterThan(0);
    expect(server.url).toContain(String(server.port));
  });

  it('rejects a second server on the same port with a clear message', async () => {
    await expect(startPlaygroundServer(playgroundDir, server.port)).rejects.toThrow(
      /already in use/,
    );
  });
});
