const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let backend = null;
let localServer = null;
let quitting = false;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
}

function waitForReady(port, processRef) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (processRef.exitCode !== null) {
        reject(new Error(`MEXE backend exited with code ${processRef.exitCode}`));
        return;
      }
      const request = http.get(`http://127.0.0.1:${port}/ready`, response => {
        response.resume();
        if (response.statusCode === 200) return resolve();
        retry();
      });
      request.setTimeout(1200, () => request.destroy());
      request.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - started > 60000) {
        reject(new Error('Timed out waiting for MEXE backend readiness (/ready).'));
      } else {
        setTimeout(poll, 500);
      }
    };
    poll();
  });
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
  })[ext] || 'application/octet-stream';
}

function startLocalServer(rendererDir, backendPort) {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      const incoming = new URL(req.url, 'http://127.0.0.1');
      if (incoming.pathname.startsWith('/api/')) {
        const options = {
          hostname: '127.0.0.1', port: backendPort,
          path: incoming.pathname.slice(4) + incoming.search,
          method: req.method, headers: { ...req.headers, host: `127.0.0.1:${backendPort}` }
        };
        const proxy = http.request(options, upstream => {
          res.writeHead(upstream.statusCode || 502, upstream.headers);
          upstream.pipe(res);
        });
        proxy.on('error', () => {
          if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ detail: 'MEXE backend unavailable' }));
        });
        req.pipe(proxy);
        return;
      }

      let requested;
      try { requested = decodeURIComponent(incoming.pathname); }
      catch { res.writeHead(400); res.end('Bad request'); return; }
      const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
      let file = path.join(rendererDir, safePath);
      if (!file.startsWith(rendererDir + path.sep) && file !== path.join(rendererDir, 'index.html')) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(rendererDir, 'index.html');
      fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
        res.end(data);
      });
    });
    localServer.once('error', reject);
    localServer.listen(0, '127.0.0.1', () => resolve(localServer.address().port));
  });
}

async function startMexe() {
  const backendPort = await freePort();
  const backendExe = path.join(process.resourcesPath, 'backend', 'mexe-backend.exe');
  const rendererDir = path.join(process.resourcesPath, 'renderer');
  if (!fs.existsSync(backendExe)) throw new Error(`Backend executable not found: ${backendExe}`);
  if (!fs.existsSync(path.join(rendererDir, 'index.html'))) throw new Error('Frontend build not found.');

  backend = spawn(backendExe, ['--port', String(backendPort)], {
    cwd: path.dirname(backendExe), windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  backend.stdout.on('data', chunk => process.stdout.write(`[backend] ${chunk}`));
  backend.stderr.on('data', chunk => process.stderr.write(`[backend] ${chunk}`));
  backend.on('error', error => console.error('Backend process error:', error));

  await waitForReady(backendPort, backend);
  const uiPort = await startLocalServer(rendererDir, backendPort);

  const window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 680,
    title: 'MEXE Demo',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.removeMenu();
  await window.loadURL(`http://127.0.0.1:${uiPort}`);
  window.on('closed', () => { if (app.quit) app.quit(); });
}

function stopChildren() {
  if (localServer) localServer.close();
  if (backend && backend.exitCode === null) {
    backend.kill();
    setTimeout(() => {
      if (backend && backend.exitCode === null) backend.kill('SIGKILL');
    }, 2500).unref();
  }
}

app.whenReady().then(() => startMexe()).catch(async error => {
  console.error(error);
  await dialog.showMessageBox({
    type: 'error', title: 'MEXE Demo could not start',
    message: 'MEXE could not start its local processing service.',
    detail: error.stack || String(error)
  });
  app.quit();
});

app.on('before-quit', () => { quitting = true; stopChildren(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', stopChildren);