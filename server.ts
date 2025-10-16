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
const BE_API = process.env['BE_API'] || 'http://127.0.0.1:8443';

// LOCAL backend (odkomentariši za test)
// const BE_API = 'http://localhost:8080';

const PRODUCT_ROUTE_REGEX = /^\/webshop\/(\d+)(?:-([a-z0-9-]+))?$/i;

interface ProductCanonicalMeta {
  idParam: string;
  slug: string | null;
}

function logDebug(message: string, payload?: unknown): void {
  if ((process.env['LOG_LEVEL'] || '').toLowerCase() === 'debug') {
    if (payload) {
      console.debug(message, payload);
    } else {
      console.debug(message);
    }
  }
}

function normalizeWhitespace(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyProductValue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function resolveProductCanonicalMeta(id: string): Promise<ProductCanonicalMeta | null> {
  try {
    const upstream = `${BE_API}/api/roba/${id}`;
    const response = await fetch(upstream);
    if (!response.ok) {
      logDebug('[PRODUCT REDIRECT] Upstream returned non-200', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data: any = await response.json();
    const brand = normalizeWhitespace(data?.proizvodjac?.naziv);
    const name = normalizeWhitespace(data?.naziv);
    const sku = normalizeWhitespace(data?.katbr);
    if (!sku) {
      return { idParam: id, slug: null };
    }

    const slug = slugifyProductValue([brand, name, sku].filter(Boolean).join(' '));
    const idParam = `${id}-${slug}`;
    return { idParam, slug };
  } catch (error) {
    logDebug('[PRODUCT REDIRECT] Failed to resolve canonical slug', error);
    return null;
  }
}

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

  server.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/error')) {
      res.setHeader('X-Robots-Tag', 'noindex, follow');
    }
    next();
  });

  // Healthcheck
  server.get(['/healthz', '/readyz'], (_req, res) => res.status(200).send('ok'));

  // ───────────────────────────────────────────────────────────────────────────
  // PROXY za sve sitemap XML rute
  // ───────────────────────────────────────────────────────────────────────────
  server.get(/^\/sitemap.*\.xml$/, async (req, res, next) => {
    const upstream = `${BE_API}${req.originalUrl}`;
    logDebug('[SITEMAP PROXY] START', { url: req.originalUrl, upstream });

    try {
      const r = await fetch(upstream, { method: 'GET' });
      logDebug('[SITEMAP PROXY] RESPONSE', {
        status: r.status,
        ct: r.headers.get('content-type'),
      });

      res.status(r.status);
      res.type('application/xml');

      const cc = r.headers.get('cache-control');
      res.setHeader('cache-control', cc || 'public, max-age=3600');

      const buf = await r.arrayBuffer();
      res.send(Buffer.from(buf));

      logDebug('[SITEMAP PROXY] DONE', {
        status: r.status,
        length: buf.byteLength,
      });
    } catch (err) {
      logDebug('[SITEMAP PROXY] ERROR', err);
      next(err);
    }
  });

  server.get(PRODUCT_ROUTE_REGEX, async (req, res, next) => {
    try {
      const match = req.path.match(PRODUCT_ROUTE_REGEX);
      if (!match) {
        return next();
      }

      const [, id, incomingSlug] = match;
      const canonical = await resolveProductCanonicalMeta(id);
      if (!canonical) {
        res.setHeader('X-Robots-Tag', 'noindex, follow');
        res.redirect(301, '/webshop');
        return;
      }

      const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      const targetPath = `/webshop/${canonical.idParam}`;
      const targetUrl = `${targetPath}${search}`;

      const providedSlug = (incomingSlug ?? '').toLowerCase();
      if (canonical.slug) {
        if (!providedSlug || providedSlug !== canonical.slug.toLowerCase()) {
          res.setHeader('X-Robots-Tag', 'noindex, follow');
          res.redirect(301, targetUrl);
          return;
        }
      } else if (incomingSlug) {
        res.setHeader('X-Robots-Tag', 'noindex, follow');
        res.redirect(301, `/webshop/${canonical.idParam}${search}`);
        return;
      }

      return next();
    } catch (error) {
      logDebug('[PRODUCT REDIRECT] Handler error', error);
      res.setHeader('X-Robots-Tag', 'noindex, follow');
      res.redirect(301, '/webshop');
      return;
    }
  });

  // Static assets
  const hashedFilePattern = /(?:\.|-)[A-Za-z0-9]{8,}\.(?:js|css|woff2?|ttf)$/;

  // ───────────────────────────────────────────────────────────────────────────
  // Blokiraj SSR da ne obrađuje /api/* rute (da ih ne guta posle 20 min)
  // ───────────────────────────────────────────────────────────────────────────
  server.get(/^\/api(\/.*)?$/, (_req, res) => {
    res.status(404).send('API handled by backend');
  });

  server.use(
    '/assets',
    express.static(join(browserDistFolder, 'assets'), {
      index: false,
      setHeaders: (res, filePath) => {
        if (hashedFilePattern.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=2592000');
        }
      },
    })
  );

  server.use(
    express.static(browserDistFolder, {
      index: false,
      setHeaders: (res, filePath) => {
        if (hashedFilePattern.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
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
        res.setHeader('Cache-Control', 'no-cache');
        res.send(html);
      })
      .catch((err) => next(err));
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  server.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('SSR/Server error:', err);
    res.setHeader('X-Robots-Tag', 'noindex, follow');
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
