import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.json':'application/json' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, '');
    if (!path || path === '.') path = 'index.html';
    if (path.startsWith('..')) throw new Error('Invalid path');
    const file = join(root, path);
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200, {'Content-Type': types[extname(file)] ?? 'application/octet-stream'});
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('Not found');
  }
}).listen(4173, () => console.log('Filefit: http://localhost:4173'));
