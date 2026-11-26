[CmdletBinding()]
param(
    [string]$OutputDirectory = ""
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Checked([string]$Command, [string[]]$Arguments, [string]$WorkingDirectory) {
    Push-Location $WorkingDirectory
    try {
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

# Locate repository root: script may be run from repository root or scripts/.
$CandidateRoots = @(
    (Get-Location).Path,
    (Split-Path -Parent $PSCommandPath),
    (Split-Path -Parent (Split-Path -Parent $PSCommandPath))
) | Select-Object -Unique

$RepoRoot = $null
foreach ($Candidate in $CandidateRoots) {
    if ((Test-Path (Join-Path $Candidate 'frontend/package.json')) -and
        (Test-Path (Join-Path $Candidate 'backend/requirements.txt')) -and
        (Test-Path (Join-Path $Candidate 'backend/app/main.py'))) {
        $RepoRoot = (Resolve-Path $Candidate).Path
        break
    }
}
if (-not $RepoRoot) {
    throw "Could not locate MEXE repository. Run this script from the repository root or save it under scripts/."
}

$Frontend = Join-Path $RepoRoot 'frontend'
$Backend = Join-Path $RepoRoot 'backend'
$Desktop = Join-Path $RepoRoot 'desktop/demo'
$Renderer = Join-Path $Desktop 'renderer'
$BackendDist = Join-Path $Desktop 'backend'
$BuildVenv = Join-Path $Desktop '.build-venv'
$PyInstallerWork = Join-Path $Desktop '.pyinstaller-work'
$Output = if ($OutputDirectory) { $OutputDirectory } else { Join-Path $RepoRoot 'dist/demo' }

Write-Step 'Checking build prerequisites'
Assert-Command 'git'
Assert-Command 'node'
Assert-Command 'npm'
Assert-Command 'py'

$NodeVersionText = (& node --version).Trim().TrimStart('v')
$NodeVersion = [version]$NodeVersionText
if ($NodeVersion -lt [version]'22.12.0') {
    throw "Node.js 22.12.0 or newer is required by the current Vite 8 lockfile. Found $NodeVersionText."
}

$PythonVersionText = (& py -3.14 --version 2>&1).ToString()

if ($LASTEXITCODE -ne 0 -or $PythonVersionText -notmatch 'Python 3\.14\.') {
    throw "Python 3.14 is required for the Demo builder. Found: $PythonVersionText"
}

Write-Host "Repository : $RepoRoot"
Write-Host "Node       : $NodeVersionText"
Write-Host "Python     : $PythonVersionText"

# Avoid packaging an unknown or dirty revision without displaying it.
$GitBranch = (& git -C $RepoRoot branch --show-current).Trim()
$GitCommit = (& git -C $RepoRoot rev-parse --short HEAD).Trim()
Write-Host "Git        : $GitBranch ($GitCommit)"

Write-Step 'Preparing demo workspace'
New-Item -ItemType Directory -Force -Path $Desktop, $Renderer, $BackendDist, $Output | Out-Null

# Desktop main process: starts FastAPI, waits for /ready, serves React assets,
# proxies same-origin /api calls, and terminates the backend with the app.
$MainProcess = @'
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
'@

$BackendEntry = @'
import argparse
import uvicorn
from app.main import app

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    uvicorn.run(app, host="127.0.0.1", port=args.port, access_log=False, log_level="info")
'@

$DesktopPackage = @'
{
  "name": "mexe-demo",
  "version": "0.1.0",
  "private": true,
  "description": "Portable standalone MEXE demonstration",
  "main": "main.cjs",
  "author": "MEXE",
  "license": "UNLICENSED",
  "devDependencies": {
    "electron": "^41.0.0",
    "electron-builder": "^26.0.0"
  },
  "build": {
    "appId": "com.mexe.demo",
    "productName": "MEXE Demo",
    "asar": true,
    "directories": { "output": "release" },
    "files": ["main.cjs", "package.json"],
    "extraResources": [
      { "from": "renderer", "to": "renderer" },
      { "from": "backend", "to": "backend" }
    ],
    "win": { "target": [{ "target": "portable", "arch": ["x64"] }] },
    "portable": { "artifactName": "MEXE-Demo-${version}-portable.${ext}" }
  }
}
'@

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText((Join-Path $Desktop 'main.cjs'), $MainProcess, $Utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $Desktop 'package.json'), $DesktopPackage, $Utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $Backend 'mexe_demo_entry.py'), $BackendEntry, $Utf8NoBom)

try {
    Write-Step 'Building React frontend'
    Invoke-Checked 'npm' @('ci') $Frontend
    $PreviousApiBase = $env:VITE_API_BASE_URL
    try {
        $env:VITE_API_BASE_URL = '/api'
        Invoke-Checked 'npm' @('run', 'build') $Frontend
    }
    finally {
        if ($null -eq $PreviousApiBase) { Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue }
        else { $env:VITE_API_BASE_URL = $PreviousApiBase }
    }
    if (Test-Path $Renderer) { Remove-Item $Renderer -Recurse -Force }
    Copy-Item (Join-Path $Frontend 'dist') $Renderer -Recurse

    Write-Step 'Preparing isolated Python build environment'

    if (-not (Test-Path (Join-Path $BuildVenv 'Scripts/python.exe'))) {
        Invoke-Checked 'py' @('-3.14', '-m', 'venv', $BuildVenv) $RepoRoot
    }

    $VenvPython = Join-Path $BuildVenv 'Scripts/python.exe'

    Invoke-Checked $VenvPython @('-m', 'pip', 'install', '--upgrade', 'pip') $RepoRoot

    Invoke-Checked $VenvPython @('-m', 'pip', 'install', '-r', (Join-Path $Backend 'requirements.txt')) $RepoRoot

    Invoke-Checked $VenvPython @('-m', 'pip', 'install', 'pyinstaller>=6.15') $RepoRoot

    Invoke-Checked $VenvPython @('-m', 'pip', 'check') $RepoRoot

    Write-Step 'Packaging FastAPI backend into a Windows executable'
    if (Test-Path $BackendDist) { Remove-Item $BackendDist -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $BackendDist | Out-Null
    $PyArgs = @(
      '-m', 'PyInstaller', '--onefile', '--clean', '--noconfirm',
      '--name', 'mexe-backend', '--distpath', $BackendDist,
      '--workpath', $PyInstallerWork, '--specpath', $Desktop,
      '--paths', $Backend,
      '--collect-all', 'fastapi', '--collect-all', 'starlette',
      '--collect-all', 'uvicorn', '--collect-all', 'PIL',
      '--collect-all', 'prometheus_client', '--collect-all', 'pythonjsonlogger',
      '--collect-all', 'multipart',
      (Join-Path $Backend 'mexe_demo_entry.py')
    )
    Invoke-Checked $VenvPython $PyArgs $RepoRoot
    if (-not (Test-Path (Join-Path $BackendDist 'mexe-backend.exe'))) {
        throw 'PyInstaller did not produce mexe-backend.exe.'
    }

    Write-Step 'Building portable Electron executable'
    Invoke-Checked 'npm' @('install', '--no-audit', '--no-fund') $Desktop
    Invoke-Checked 'npx' @('electron-builder', '--win', 'portable', '--x64', '--publish', 'never') $Desktop

    $Built = Get-ChildItem -Path (Join-Path $Desktop 'release') -Filter '*portable.exe' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Built) { throw 'Electron Builder did not produce a portable EXE.' }
    Copy-Item $Built.FullName $Output -Force

    Write-Step 'Demo executable created'
    Write-Host "Output: $Output" -ForegroundColor Green
    Write-Host "File  : $(Join-Path $Output $Built.Name)" -ForegroundColor Green
    Write-Host "Source: $GitBranch ($GitCommit)"
}
finally {
    Remove-Item (Join-Path $Backend 'mexe_demo_entry.py') -Force -ErrorAction SilentlyContinue
}
