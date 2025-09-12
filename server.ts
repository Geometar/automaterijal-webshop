// server.ts  (Angular SSR + sitemap proxy, prod ready, no helmet)

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// ───────────────────────────────────────────────────────────────────────────────
// Konfiguracija backend API-ja
// Zakomentariši/odkomentariši po potrebi
// ───────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env['PORT'] || 4000);

// PROD backend
const BE_API = 'https://automaterijal.com:8443';

// LOCAL backend (odkomentariši za test)
// const BE_API = 'http://localhost:8080';

// ───────────────────────────────────────────────────────────────────────────────
// App factory
// ───────────────────────────────────────────────────────────────────────────────
export function app(): express.Express {
  const server = express();
  server.disable('x-powered-by');
  server.set('trust proxy', true);

  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Healthcheck
  server.get(['/healthz', '/readyz'], (_req, res) => res.status(200).send('ok'));

  // ───────────────────────────────────────────────────────────────────────────
  // PROXY za sve sitemap XML rute
  // ───────────────────────────────────────────────────────────────────────────
  server.get(/^\/sitemap.*\.xml$/, async (req, res, next) => {
    const upstream = `${BE_API}${req.originalUrl}`;
    console.log('[SITEMAP PROXY] START', { url: req.originalUrl, upstream });

    try {
      const r = await fetch(upstream, { method: 'GET' });
      console.log('[SITEMAP PROXY] RESPONSE', {
        status: r.status,
        ct: r.headers.get('content-type'),
      });

      res.status(r.status);
      res.type('application/xml');

      const cc = r.headers.get('cache-control');
      res.setHeader('cache-control', cc || 'public, max-age=3600');

      const buf = await r.arrayBuffer();
      res.send(Buffer.from(buf));

      console.log('[SITEMAP PROXY] DONE', {
        status: r.status,
        length: buf.byteLength,
      });
    } catch (err) {
      console.error('[SITEMAP PROXY] ERROR', err);
      next(err);
    }
  });

  // Static assets
  server.use(
    '/assets',
    express.static(join(browserDistFolder, 'assets'), { maxAge: '1y', immutable: true })
  );

  server.use(
    express.static(browserDistFolder, {
      maxAge: '1h',
      index: false,
    })
  );

  // SSR za sve regularne rute
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        res.setHeader('cache-control', 'no-store');
        res.send(html);
      })
      .catch((err) => next(err));
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  server.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('SSR/Server error:', err);
    res.status(500).send('Server error');
  });

  return server;
}

// ───────────────────────────────────────────────────────────────────────────────
// Run (prod)
// ───────────────────────────────────────────────────────────────────────────────
function run(): void {
  const server = app();
  server.listen(PORT, () => {
    console.log(`✅ Node Express SSR listening on http://localhost:${PORT}`);
    console.log(`   Proxying sitemaps to: ${BE_API}`);
  });
}

run();