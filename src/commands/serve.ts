/**
 * devsetgo — Serve Command
 *
 * Local development server with hot-reload for the playground.
 */

import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
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
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
};

export async function serveCommand(cwd: string, options: ServeOptions): Promise<void> {
  const absRoot = resolve(cwd);
  const port = parseInt(options.port || '3000', 10);

  log.banner('devsetgo serve');

  // Load config to find the output directory
  const config = await loadConfig(absRoot, { config: options.config });
  const playgroundDir = resolve(absRoot, config.playground.output_dir);

  if (!existsSync(playgroundDir)) {
    log.error(`Playground directory not found: ${playgroundDir}`);
    log.info('Run "devsetgo build" or "devsetgo playground" first.');
    process.exit(1);
  }

  // Create a simple static file server
  const server = createServer(async (req, res) => {
    const url = req.url || '/';
    let filePath = join(playgroundDir, url === '/' ? 'index.html' : url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(playgroundDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Try to serve the file
    try {
      if (!existsSync(filePath)) {
        // SPA fallback: serve index.html for unknown routes
        filePath = join(playgroundDir, 'index.html');
      }

      const content = await readFile(filePath);
      const ext = extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      // Inject hot-reload script for HTML files
      if (ext === '.html') {
        const html = content.toString('utf-8');
        const injectedHtml = html.replace(
          '</body>',
          `<script>
            // devsetgo hot-reload (dev mode)
            let lastCheck = Date.now();
            setInterval(async () => {
              try {
                const res = await fetch('/__devsetgo_ping');
                if (res.ok) {
                  const data = await res.json();
                  if (data.buildTime > lastCheck) {
                    lastCheck = data.buildTime;
                    window.location.reload();
                  }
                }
              } catch {}
            }, 1500);
          </script>
          </body>`,
        );
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
        });
        res.end(injectedHtml);
        return;
      }

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  // Handle the ping endpoint for hot-reload
  server.on('request', (req, res) => {
    if (req.url === '/__devsetgo_ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ buildTime: Date.now() }));
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    log.success(`Server running at ${pc.bold(pc.cyan(url))}`);
    log.info('Press Ctrl+C to stop');

    if (options.open) {
      // Open browser
      const { exec } = require('node:child_process');
      const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${cmd} ${url}`);
    }
  });
}
