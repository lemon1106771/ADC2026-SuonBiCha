import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const assets = {
  '/': ['../workplace/index.html', 'text/html; charset=utf-8'],
  '/workplace.css': ['../workplace/workplace.css', 'text/css; charset=utf-8'],
  '/workplace.js': ['../workplace/workplace.js', 'text/javascript; charset=utf-8'],
  '/font.ttf': ['../neo-extension/fonts/Manrope.ttf', 'font/ttf'],
  '/guide': ['../PROTOTYPE.md', 'text/plain; charset=utf-8']
};
export function createWorkplaceServer() {
  return http.createServer(async (req, res) => {
    const asset = assets[(req.url || '').split('?')[0]];
    if (req.method !== 'GET' || !asset) { res.writeHead(404); res.end('Not found'); return; }
    try { const bytes = await readFile(fileURLToPath(new URL(asset[0], import.meta.url))); res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'" }); res.end(bytes); }
    catch { res.writeHead(500); res.end('Could not load the workspace.'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createWorkplaceServer();
  server.on('error', error => { console.error(`Workplace server: ${error.code || 'failed'}`); process.exitCode = 1; });
  server.listen(4319, '127.0.0.1', () => console.log('Workplace example: http://127.0.0.1:4319 — load Neo in Chrome to use the companion.'));
}
