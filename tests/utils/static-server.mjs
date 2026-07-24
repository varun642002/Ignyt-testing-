import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'www');
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requested = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
  const file = requested.startsWith(root) && existsSync(requested) && statSync(requested).isFile() ? requested : join(root, 'index.html');
  res.writeHead(200, { 'content-type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
});
server.listen(4173, '127.0.0.1');
const shutdown = () => server.close(() => process.exit(0));
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
