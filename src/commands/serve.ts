/**
 * devsetgo — Serve Command
 *
 * Local development server with live-reload for the playground.
 */

import { resolve, join, sep, extname, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { log } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import pc from 'picocolors';

interface ServeOptions {
  config?: string;
  verbose?: boolean;
  port?: string;
  open?: boolean;
}

/** MIME type map */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

/** Endpoint the injected live-reload script polls. */
const PING_PATH = '/__devsetgo_ping';

/**
 * Resolve a request URL to a file inside `root`, or null if it escapes.
 *
 * Rejecting traversal needs the trailing separator: a bare `startsWith(root)`
 * would accept a sibling directory whose name merely begins with the root's
 * (e.g. root `/site/play` and target `/site/play-secret`).
 */
export function resolveRequestPath(root: string, requestUrl: string): string | null {
  // Strip query string and fragment, then decode percent-escapes so that an
  // encoded `%2e%2e` is caught by the containment check below.
  const pathOnly = requestUrl.split(/[?#]/, 1)[0] || '/';

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    return null; // Malformed percent-encoding.
  }

  if (decoded.includes('\0')) return null;

  const relPath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = normalize(join(root, relPath));

  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }

  return candidate;
}

/** Script injected into served HTML to reload the page after a rebuild. */
function liveReloadScript(): string {
  return `<script>
(function () {
  var token = null;
  setInterval(async function () {
    try {
      var res = await fetch('${PING_PATH}', { cache: 'no-store' });
      if (!res.ok) return;
      var data = await res.json();
      // First response establishes the baseline; only a *change* reloads.
      if (token === null) { token = data.token; return; }
      if (data.token !== token) location.reload();
    } catch (e) { /* server restarting - keep polling */ }
  }, 1500);
})();
</script>`;
}

/**
 * Build a change token from the playground's own files.
 *
 * Using index.html's mtime (rather than Date.now()) is what makes the reload
 * fire on rebuilds only, instead of on every single poll.
 */
async function buildToken(playgroundDir: string): Promise<string> {
  try {
    const stats = await stat(join(playgroundDir, 'index.html'));
    return String(stats.mtimeMs);
  } catch {
    return '0';
  }
}

/** Open a URL in the user's default browser, without going through a shell. */
function openBrowser(url: string): void {
  let cmd: string;
  let args: string[];

  if (process.platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  try {
    // `spawn` without a shell means the URL is passed as a single argv entry
    // and never re-parsed by a command interpreter.
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => log.debug(`Could not open browser: ${url}`));
    child.unref();
  } catch {
    log.debug(`Could not open browser: ${url}`);
  }
}

/** A running playground server. */
export interface PlaygroundServer {
  /** The port actually bound (resolved, so port 0 reports the real one). */
  port: number;
  /** Base URL for local requests. */
  url: string;
  /** Stop listening and resolve once closed. */
  close: () => Promise<void>;
}

/**
 * Build and start the static playground server.
 *
 * Split out from `serveCommand` so tests can drive a real socket and read back
 * the bound port; the command itself only adds banner output and the
 * wait-for-signal loop.
 */
export async function startPlaygroundServer(
  playgroundDir: string,
  port: number,
): Promise<PlaygroundServer> {
  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = req.url || '/';

    // Live-reload poll. Handled first, and this is the only request listener —
    // registering a second one would double-write the response.
    if (url.split('?', 1)[0] === PING_PATH) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ token: await buildToken(playgroundDir) }));
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method Not Allowed');
      return;
    }

    let filePath = resolveRequestPath(playgroundDir, url);
    if (filePath === null) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      if (!existsSync(filePath)) {
        // SPA fallback: unknown routes render the shell.
        filePath = join(playgroundDir, 'index.html');
        if (!existsSync(filePath)) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
      }

      const content = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      if (ext === '.html') {
        const html = content.toString('utf-8');
        const injected = html.includes('</body>')
          ? html.replace('</body>', `${liveReloadScript()}\n</body>`)
          : html + liveReloadScript();

        res.writeHead(200, { 'Content-Type': mimeType, 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : injected);
        return;
      }

      res.writeHead(200, { 'Content-Type': mimeType, 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (err) {
      log.debug(`Error serving ${url}: ${err}`);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  };

  const server = createServer((req, res) => {
    void handler(req, res).catch((err) => {
      log.debug(`Unhandled request error: ${err}`);
      if (!res.headersSent) res.writeHead(500);
      res.end('Internal Server Error');
    });
  });

  const boundPort = await new Promise<number>((resolvePromise, rejectPromise) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        rejectPromise(
          new Error(`Port ${port} is already in use. Try "devsetgo serve --port ${port + 1}".`),
        );
      } else if (err.code === 'EACCES') {
        rejectPromise(new Error(`Permission denied binding to port ${port}.`));
      } else {
        rejectPromise(err);
      }
    });

    server.listen(port, () => {
      const address = server.address();
      resolvePromise(typeof address === 'object' && address ? address.port : port);
    });
  });

  return {
    port: boundPort,
    url: `http://localhost:${boundPort}`,
    close: () =>
      new Promise<void>((resolvePromise) => {
        server.close(() => resolvePromise());
        // Don't hang forever on keep-alive connections.
        setTimeout(() => resolvePromise(), 2000).unref();
        server.closeAllConnections?.();
      }),
  };
}

export async function serveCommand(cwd: string, options: ServeOptions): Promise<void> {
  const absRoot = resolve(cwd);

  const port = Number.parseInt(options.port ?? '3000', 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${options.port}. Expected an integer between 0 and 65535.`);
  }

  log.banner('devsetgo serve');

  const config = await loadConfig(absRoot, { config: options.config });
  const playgroundDir = resolve(absRoot, config.playground.output_dir);

  if (!existsSync(playgroundDir)) {
    throw new Error(
      `Playground directory not found: ${playgroundDir}\n` +
        `Run "devsetgo build" or "devsetgo playground" first.`,
    );
  }

  const server = await startPlaygroundServer(playgroundDir, port);

  log.success(`Server running at ${pc.bold(pc.cyan(server.url))}`);
  log.info('Press Ctrl+C to stop');

  if (options.open) openBrowser(server.url);

  // Keep the process alive until interrupted, then shut down cleanly.
  await new Promise<void>((resolvePromise) => {
    const shutdown = (): void => {
      log.info('Shutting down...');
      void server.close().then(() => resolvePromise());
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}
