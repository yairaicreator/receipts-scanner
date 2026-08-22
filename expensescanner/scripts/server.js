// Plain Node host: serves the built site from dist/ and mounts the same
// handlers Vercel runs from api/. Use it to run the app locally (or on any
// box that isn't Vercel) — `npm run build && npm start`.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** Minimal stand-in for the response helpers Vercel adds to `res`. */
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  const send = res.send?.bind(res);
  res.send = (body) => {
    if (send) return send(body);
    res.end(body);
    return res;
  };
  return res;
}

const handlers = new Map();
async function getHandler(name) {
  if (!handlers.has(name)) {
    const file = path.join(ROOT, 'api', `${name}.js`);
    if (!fs.existsSync(file)) return null;
    handlers.set(name, (await import(`file://${file}`)).default);
  }
  return handlers.get(name);
}

function serveStatic(req, res) {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = path.join(DIST, requested);
  // Keep traversal inside dist/, and fall back to the SPA entry point.
  if (!filePath.startsWith(DIST) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end('Run `npm run build` first.');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) {
    const handler = await getHandler(pathname.slice(5).replace(/[^\w-]/g, ''));
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"No such endpoint."}');
      return;
    }
    try {
      await handler(req, decorate(res));
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"Server error."}');
    }
    return;
  }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Expense Scanner running on http://localhost:${PORT}`);
});
