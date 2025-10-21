// server.ts  (Angular SSR + sitemap proxy, prod ready, no helmet)

import { APP_BASE_HREF } from '@angular/common';
import { APP_INITIALIZER, TransferState } from '@angular/core';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { SSR_PRODUCT_DATA, SSR_PRODUCT_STATE_KEY } from './src/app/shared/tokens/ssr-product.token';

declare global {
  namespace Express {
    interface Locals {
      ssrProduct?: any;
    }
  }
}

const LOG_LEVEL = (process.env['LOG_LEVEL'] || 'info').toLowerCase();
const LEVEL_WEIGHT: Record<'error' | 'warn' | 'info' | 'debug', number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(level: keyof typeof LEVEL_WEIGHT): boolean {
  const current = LEVEL_WEIGHT[(LOG_LEVEL as keyof typeof LEVEL_WEIGHT) || 'info'];
  return LEVEL_WEIGHT[level] <= (current ?? LEVEL_WEIGHT.info);
}

function log(level: keyof typeof LEVEL_WEIGHT, message: string, payload?: unknown): void {
  if (!shouldLog(level)) return;
  const prefix = `[SSR ${level.toUpperCase()}]`;
  if (payload) {
    console.log(prefix, message, payload);
  } else {
    console.log(prefix, message);
  }
}

function logDebug(message: string, payload?: unknown): void {
  log('debug', message, payload);
}

function logInfo(message: string, payload?: unknown): void {
  log('info', message, payload);
}

function logWarn(message: string, payload?: unknown): void {
  log('warn', message, payload);
}

function logError(message: string, payload?: unknown): void {
  log('error', message, payload);
}

// ───────────────────────────────────────────────────────────────────────────────
// Konfiguracija backend API-ja
// Zakomentariši/odkomentariši po potrebi
// ───────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env['PORT'] || 4000);

// Backend API endpoint (override with BE_API env var in different environments)
const BE_API = process.env['BE_API'] || 'http://127.0.0.1:8443';

const PRODUCT_ROUTE_REGEX = /^\/webshop\/(\d+)(?:-([a-z0-9-]+))?$/i;

interface ProductCanonicalMeta {
  idParam: string;
  slug: string | null;
  product?: any;
}

function embedProductTransferState(html: string, product: any): string {
  if (!product) {
    return html;
  }

  const stateKey = 'SSR_PRODUCT_DATA';
  const scriptRegex = /<script id="ng-state" type="application\/json">([^<]*)<\/script>/;
  const existingScript = html.match(scriptRegex);

  try {
    const initialState = existingScript && existingScript[1] ? JSON.parse(existingScript[1]) : {};
    initialState[stateKey] = product;
    const serialized = JSON.stringify(initialState);
    if (existingScript) {
      return html.replace(scriptRegex, `<script id="ng-state" type="application/json">${serialized}<\/script>`);
    }
    return html.replace('</body>', `<script id="ng-state" type="application/json">${serialized}</script></body>`);
  } catch (error) {
    logWarn('[SSR PRODUCT] Failed to serialize TransferState', error);
    return html;
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
      logWarn('[PRODUCT REDIRECT] Upstream returned non-200', {
        status: response.status,
        statusText: response.statusText,
        upstream,
      });
      return null;
    }

    const data: any = await response.json();
    const hasValidId = typeof data?.robaid === 'number';
    if (!hasValidId) {
      logWarn('[PRODUCT REDIRECT] Upstream payload missing robaid', { id, data });
      return null;
    }

    const brand = normalizeWhitespace(data?.proizvodjac?.naziv);
    const name = normalizeWhitespace(data?.naziv);
    const sku = normalizeWhitespace(data?.katbr);
    if (!sku) {
      return { idParam: id, slug: null, product: data };
    }

    const slug = slugifyProductValue([brand, name, sku].filter(Boolean).join(' '));
    const idParam = `${id}-${slug}`;
    logInfo('[PRODUCT REDIRECT] Canonical meta resolved', {
      id,
      idParam,
      slug,
      brand,
      name,
      hasSku: Boolean(sku),
    });
    return { idParam, slug, product: data };
  } catch (error) {
    logError('[PRODUCT REDIRECT] Failed to resolve canonical slug', error);
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
    logInfo('[SITEMAP PROXY] START', { url: req.originalUrl, upstream });

    try {
      const r = await fetch(upstream, { method: 'GET' });
      logInfo('[SITEMAP PROXY] RESPONSE', {
        status: r.status,
        ct: r.headers.get('content-type'),
      });

      res.status(r.status);
      res.type('application/xml');

      const cc = r.headers.get('cache-control');
      res.setHeader('cache-control', cc || 'public, max-age=3600');

      const buf = await r.arrayBuffer();
      res.send(Buffer.from(buf));

      logInfo('[SITEMAP PROXY] DONE', {
        status: r.status,
        length: buf.byteLength,
      });
    } catch (err) {
      logError('[SITEMAP PROXY] ERROR', err);
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
      logInfo('[PRODUCT ROUTE] Incoming request', {
        path: req.path,
        originalUrl: req.originalUrl,
        id,
        incomingSlug,
      });
      const canonical = await resolveProductCanonicalMeta(id);
      if (!canonical) {
        res.setHeader('X-Robots-Tag', 'noindex, follow');
        logWarn('[PRODUCT ROUTE] Canonical resolution failed, redirecting to /webshop', {
          id,
          incomingSlug,
        });
        res.redirect(301, '/webshop');
        return;
      }

      const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      const targetPath = `/webshop/${canonical.idParam}`;
      const targetUrl = `${targetPath}${search}`;

      const providedSlug = (incomingSlug ?? '').toLowerCase();
      if (canonical.slug) {
        if (!providedSlug || providedSlug !== canonical.slug.toLowerCase()) {
          logInfo('[PRODUCT ROUTE] Redirecting to canonical slug', {
            providedSlug: providedSlug || null,
            expectedSlug: canonical.slug,
            targetUrl,
          });
          res.setHeader('X-Robots-Tag', 'noindex, follow');
          res.redirect(301, targetUrl);
          return;
        }
      } else if (incomingSlug) {
        logInfo('[PRODUCT ROUTE] Removing extraneous slug, redirecting', {
          incomingSlug,
          target: `/webshop/${canonical.idParam}${search}`,
        });
        res.setHeader('X-Robots-Tag', 'noindex, follow');
        res.redirect(301, `/webshop/${canonical.idParam}${search}`);
        return;
      }

      if (canonical.product) {
        res.locals.ssrProduct = canonical.product;
        logInfo('[PRODUCT REDIRECT] Injected SSR product', {
          id,
          slug: canonical.slug,
          idParam: canonical.idParam,
          hasSeoFields: Boolean(canonical.product?.naziv),
        });
      } else {
        logWarn('[PRODUCT REDIRECT] Missing product payload after canonical resolution', {
          id,
          slug: canonical.slug,
          idParam: canonical.idParam,
        });
      }

      return next();
    } catch (error) {
      logError('[PRODUCT REDIRECT] Handler error', error);
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
    const productData = res.locals?.ssrProduct ?? null;
    logDebug('[SSR PRODUCT] provider payload', {
      hasProduct: Boolean(productData),
      keys: productData ? Object.keys(productData) : [],
    });

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: SSR_PRODUCT_DATA, useValue: productData },
          {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: (transferState: TransferState, data: any) => () => {
              if (data) {
                transferState.set(SSR_PRODUCT_STATE_KEY, data);
                logInfo('[SSR PRODUCT] transfer state seeded via provider', {
                  id: (data as any)?.robaid,
                  naziv: (data as any)?.naziv,
                });
              } else {
                logDebug('[SSR PRODUCT] initializer executed without product payload');
              }
            },
            deps: [TransferState, SSR_PRODUCT_DATA],
          },
        ],
      })
      .then((html) => {
        const finalHtml = embedProductTransferState(html, productData);
        if (productData) {
          logInfo('[SSR PRODUCT] TransferState embedded', { id: productData?.robaid });
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.send(finalHtml);
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
