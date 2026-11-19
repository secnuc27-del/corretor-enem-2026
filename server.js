'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = 3000;
const HOST = '127.0.0.1';
const PUBLIC_DIR = path.resolve(__dirname);
const PUBLIC_REAL_DIR = fs.realpathSync(PUBLIC_DIR);
const ALLOWED_DIRECTORIES = new Set(['assets', 'css', 'js', 'provas']);
const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
});

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cache-Control': 'no-cache'
});

function setSecurityHeaders(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
}

function sendText(response, statusCode, message, extraHeaders = {}) {
  const body = `${message}\n`;
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  });
  response.end(body);
}

function isInsideDirectory(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

function resolvePublicPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname.includes('\0') || pathname.includes('\\')) return null;
  pathname = pathname.replace(/^\/+/, '');
  if (!pathname) pathname = 'index.html';

  const segments = pathname.split('/');
  if (segments.some(segment => !segment || segment.startsWith('.'))) return null;

  const allowedRootFiles = new Set(['index.html', 'favicon.ico', 'site.webmanifest']);
  const isAllowedRootFile = segments.length === 1 && allowedRootFiles.has(segments[0]);
  if (!isAllowedRootFile && !ALLOWED_DIRECTORIES.has(segments[0])) return null;

  const target = path.resolve(PUBLIC_DIR, pathname);
  if (!isInsideDirectory(PUBLIC_DIR, target)) return null;
  return target;
}

function parseByteRange(header, fileSize) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || fileSize <= 0) return null;

  let start;
  let end;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? fileSize - 1 : Number(match[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    end = Math.min(end, fileSize - 1);
  }

  if (start < 0 || start >= fileSize || end < start) return null;
  return { start, end };
}

const server = http.createServer((request, response) => {
  setSecurityHeaders(response);

  const requestHost = request.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(requestHost)) {
    return sendText(response, 403, 'Acesso negado.');
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.setHeader('Connection', 'close');
    request.resume();
    return sendText(response, 405, 'Método não permitido.');
  }

  let requestedFile;
  try {
    requestedFile = resolvePublicPath(request.url || '/');
  } catch {
    return sendText(response, 400, 'Requisição inválida.');
  }
  if (!requestedFile) return sendText(response, 404, 'Arquivo não encontrado.');

  fs.realpath(requestedFile, (realPathError, realFile) => {
    if (realPathError) return sendText(response, 404, 'Arquivo não encontrado.');
    if (!isInsideDirectory(PUBLIC_REAL_DIR, realFile)) return sendText(response, 403, 'Acesso negado.');

    const extension = path.extname(realFile).toLowerCase();
    const contentType = MIME_TYPES[extension];
    if (!contentType) return sendText(response, 404, 'Arquivo não encontrado.');

    fs.stat(realFile, (statError, stats) => {
      if (statError || !stats.isFile()) return sendText(response, 404, 'Arquivo não encontrado.');

      const commonHeaders = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };
      const rangeHeader = request.headers.range;

      if (rangeHeader) {
        const range = parseByteRange(rangeHeader, stats.size);
        if (!range) {
          return sendText(response, 416, 'Intervalo inválido.', {
            'Content-Range': `bytes */${stats.size}`,
            ...commonHeaders
          });
        }

        const length = range.end - range.start + 1;
        response.writeHead(206, {
          ...commonHeaders,
          'Content-Range': `bytes ${range.start}-${range.end}/${stats.size}`,
          'Content-Length': length
        });
        if (request.method === 'HEAD') return response.end();

        const stream = fs.createReadStream(realFile, { start: range.start, end: range.end });
        stream.on('error', () => {
          if (!response.headersSent) sendText(response, 500, 'Erro ao ler o arquivo.');
          else response.destroy();
        });
        return stream.pipe(response);
      }

      response.writeHead(200, { ...commonHeaders, 'Content-Length': stats.size });
      if (request.method === 'HEAD') return response.end();

      const stream = fs.createReadStream(realFile);
      stream.on('error', () => {
        if (!response.headersSent) sendText(response, 500, 'Erro ao ler o arquivo.');
        else response.destroy();
      });
      stream.pipe(response);
    });
  });
});

server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 50;

server.on('error', error => {
  console.error(`Não foi possível iniciar o servidor: ${error.message}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('==================================================');
  console.log('  CORRETOR ENEM 2026 - SERVIDOR LOCAL PROTEGIDO');
  console.log('==================================================');
  console.log(`  Acesse no navegador: http://${HOST}:${PORT}`);
  console.log('  Este servidor aceita conexões apenas deste computador.');
  console.log('  Pressione CTRL+C para encerrar.');
  console.log('==================================================');
});
