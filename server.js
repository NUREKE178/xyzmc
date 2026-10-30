'use strict';
/**
 * Локальный/VPS-сервер: отдаёт статику из public/, загрузки из data/uploads/ и API.
 *   ADMIN_PASSWORD=ваш-пароль node server.js
 * На Vercel этот файл не используется.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handle } = require('./lib/app');
const { UPLOAD_DIR } = require('./lib/store');

const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 8787;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Не найдено'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    if (file.endsWith('admin.html')) Object.assign(headers, { 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');   // нужен для воспроизведения видео
    if (range) {
      const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api' || pathname.startsWith('/api/')) return handle(req, res);

  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end(); }
  if (rel.startsWith('/uploads/')) return serveFile(req, res, path.join(UPLOAD_DIR, path.basename(rel)));

  const target = path.normalize(path.join(PUBLIC, rel === '/' ? 'index.html' : rel));
  if (!target.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }   // защита от ../
  serveFile(req, res, target);
}).listen(PORT, () => console.log(`XYZ: http://localhost:${PORT}  (админка: /admin.html)`));
