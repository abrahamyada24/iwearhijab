#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const backendDir = path.join(repoRoot, 'pos-be');
const envPath = path.join(backendDir, '.env');
const requiredOrigin = 'https://iwear.example';

function fail(message) {
  console.error(`\nDEPLOY GAGAL: ${message}`);
  process.exit(1);
}

function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    fail(`File environment tidak ditemukan: ${envPath}`);
  }
  return fs.readFileSync(envPath, 'utf8');
}

function parseEnvValue(source, key) {
  const match = source.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)\\s*$`, 'm'));
  if (!match) return '';

  const raw = match[1].trim();
  if (
    raw.length >= 2 &&
    ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    return raw.slice(1, -1);
  }
  return raw.replace(/\s+#.*$/, '').trim();
}

function upsertEnvValue(source, key, value) {
  const line = `${key}=${JSON.stringify(value)}`;
  const matcher = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'm');
  if (matcher.test(source)) return source.replace(matcher, line);
  return `${source.replace(/\s*$/, '')}\n${line}\n`;
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    stdio: options.stdio || 'inherit',
    encoding: 'utf8',
  });

  if (result.error) fail(`${command} tidak dapat dijalankan: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} berhenti dengan exit code ${result.status}`);
  return result;
}

function commandSucceeds(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function createDatabaseBackup(databaseUrl, backupDir, stamp) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail('DATABASE_URL pada pos-be/.env tidak valid.');
  }

  if (parsed.protocol !== 'mysql:') fail('DATABASE_URL bukan koneksi MySQL.');

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) fail('Nama database tidak ditemukan pada DATABASE_URL.');

  const outputPath = path.join(backupDir, `pos-db-${stamp}.sql.gz`);
  const outputFd = fs.openSync(outputPath, 'wx', 0o600);
  const dumpArgs = [
    '--protocol=TCP',
    '--host',
    parsed.hostname || '127.0.0.1',
    '--port',
    parsed.port || '3306',
    '--user',
    decodeURIComponent(parsed.username),
    '--single-transaction',
    '--routines',
    '--triggers',
    '--databases',
    database,
  ];

  console.log(`Membuat backup database ke ${outputPath}`);
  const dump = spawn('mysqldump', dumpArgs, {
    cwd: backendDir,
    env: {
      ...process.env,
      MYSQL_PWD: decodeURIComponent(parsed.password),
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const gzip = spawn('gzip', ['-c'], {
    cwd: backendDir,
    stdio: ['pipe', outputFd, 'inherit'],
  });

  dump.stdout.pipe(gzip.stdin);

  const exitCode = (child, name) =>
    new Promise((resolve, reject) => {
      child.once('error', (error) => reject(new Error(`${name}: ${error.message}`)));
      child.once('close', (code) => resolve(code));
    });

  let dumpCode;
  let gzipCode;
  try {
    [dumpCode, gzipCode] = await Promise.all([
      exitCode(dump, 'mysqldump'),
      exitCode(gzip, 'gzip'),
    ]);
  } catch (error) {
    fs.closeSync(outputFd);
    fail(error.message);
  }
  fs.closeSync(outputFd);

  if (dumpCode !== 0 || gzipCode !== 0) {
    fs.rmSync(outputPath, { force: true });
    fail(`Backup database gagal (mysqldump=${dumpCode}, gzip=${gzipCode}).`);
  }

  run('gzip', ['-t', outputPath], { cwd: backendDir });
  return outputPath;
}

function createUploadsBackup(envSource, backupDir, stamp) {
  const configured = parseEnvValue(envSource, 'UPLOAD_DIR') || 'public/uploads';
  const uploadsDir = path.isAbsolute(configured)
    ? configured
    : path.resolve(backendDir, configured);

  if (!fs.existsSync(uploadsDir)) {
    console.log(`Folder upload tidak ditemukan (${uploadsDir}); backup upload dilewati.`);
    return null;
  }

  const outputPath = path.join(backupDir, `uploads-${stamp}.tar.gz`);
  run('tar', ['-czf', outputPath, '-C', path.dirname(uploadsDir), path.basename(uploadsDir)], {
    cwd: backendDir,
  });
  run('tar', ['-tzf', outputPath], { cwd: backendDir, stdio: 'ignore' });
  return outputPath;
}

function configureProductionEnv(envSource) {
  const databaseUrl = parseEnvValue(envSource, 'DATABASE_URL');
  const jwtSecret = parseEnvValue(envSource, 'JWT_SECRET');
  if (!databaseUrl) fail('DATABASE_URL kosong; deployment dihentikan sebelum perubahan database.');
  if (!jwtSecret) fail('JWT_SECRET kosong; deployment dihentikan.');

  let licenseSecret = parseEnvValue(envSource, 'LICENSE_CODE_SECRET');
  if (!licenseSecret || /change|replace|secret/i.test(licenseSecret) || licenseSecret.length < 32) {
    licenseSecret = crypto.randomBytes(32).toString('hex');
    console.log('LICENSE_CODE_SECRET baru dibuat tanpa menampilkannya di layar.');
  }

  const currentOrigins = parseEnvValue(envSource, 'CORS_ORIGINS')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = [...new Set([...currentOrigins, requiredOrigin])];

  let updated = envSource;
  updated = upsertEnvValue(updated, 'NODE_ENV', 'production');
  updated = upsertEnvValue(updated, 'LICENSE_CODE_SECRET', licenseSecret);
  updated = upsertEnvValue(updated, 'CORS_ORIGINS', origins.join(','));
  updated = upsertEnvValue(updated, 'ENABLE_API_DOCS', 'false');

  if (updated !== envSource) {
    fs.writeFileSync(envPath, updated, { mode: 0o600 });
  }
  fs.chmodSync(envPath, 0o600);
  return databaseUrl;
}

function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 3000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => resolve({ status: response.statusCode || 0, body }));
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

async function waitForHealth() {
  let lastError = 'belum merespons';
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      const response = await requestStatus('http://127.0.0.1:5100/api/health');
      if (response.status === 200) {
        console.log(`Health check backend berhasil: HTTP ${response.status}`);
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  fail(`Backend tidak sehat setelah restart: ${lastError}`);
}

async function verifyLicenseRoute() {
  const response = await requestStatus('http://127.0.0.1:5100/api/license/status');
  if (response.status === 404 || response.status >= 500) {
    fail(`Endpoint lisensi bermasalah: HTTP ${response.status}`);
  }
  console.log(`Endpoint lisensi tersedia: HTTP ${response.status} (401/403 normal tanpa login).`);
}

async function main() {
  console.log('=== Iwearing Hijab: deployment backend ===');
  if (!commandSucceeds('node', ['--version'])) fail('Node.js tidak tersedia.');
  if (!commandSucceeds('npm', ['--version'])) fail('npm tidak tersedia.');
  if (!commandSucceeds('pm2', ['--version'])) fail('PM2 tidak tersedia.');
  if (!commandSucceeds('mysqldump', ['--version'])) fail('mysqldump tidak tersedia.');
  if (!commandSucceeds('gzip', ['--version'])) fail('gzip tidak tersedia.');
  if (!commandSucceeds('tar', ['--version'])) fail('tar tidak tersedia.');

  const originalEnv = readEnvFile();
  const databaseUrl = parseEnvValue(originalEnv, 'DATABASE_URL');
  if (!databaseUrl) fail('DATABASE_URL kosong; backup tidak dapat dibuat.');

  const stamp = timestamp();
  const backupDir = path.join(os.homedir(), 'iwear-backup');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

  const databaseBackup = await createDatabaseBackup(databaseUrl, backupDir, stamp);
  const uploadsBackup = createUploadsBackup(originalEnv, backupDir, stamp);
  configureProductionEnv(originalEnv);

  run('npm', ['ci'], { cwd: backendDir });
  run('npm', ['test'], { cwd: backendDir });
  run('npm', ['run', 'build'], { cwd: backendDir });
  run('npm', ['run', 'db:deploy'], { cwd: backendDir });

  let processName = null;
  if (commandSucceeds('pm2', ['describe', 'pos-backend'], backendDir)) {
    processName = 'pos-backend';
  } else if (commandSucceeds('pm2', ['describe', 'iwear-api'], backendDir)) {
    processName = 'iwear-api';
  }

  if (processName) {
    run('pm2', ['reload', processName, '--update-env'], { cwd: backendDir });
  } else {
    run('pm2', ['start', 'ecosystem.config.cjs'], { cwd: backendDir });
    processName = 'iwear-api';
  }
  run('pm2', ['save'], { cwd: backendDir });

  await waitForHealth();
  await verifyLicenseRoute();

  console.log('\n=== DEPLOY BACKEND BERHASIL ===');
  console.log(`PM2 process : ${processName}`);
  console.log(`DB backup  : ${databaseBackup}`);
  if (uploadsBackup) console.log(`Upload backup: ${uploadsBackup}`);
  console.log('Secret lisensi tersimpan di pos-be/.env dan tidak dicetak ke layar.');
}

main().catch((error) => fail(error.stack || error.message));
