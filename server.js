const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'db.json');
const RUNTIME_DB_PATH = path.join(ROOT, 'db.runtime.json');
const PUBLIC_FILES = new Set(['/index.html', '/app.js', '/styles.css']);
const TRUSTED_ORIGINS = new Set(['http://127.0.0.1:8080', 'http://localhost:8080']);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function setSecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:8080 http://localhost:8080; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && TRUSTED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(req, res, statusCode, payload) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getLoanDecision(creditScore) {
  if (creditScore < 600) {
    return 'Declined';
  }

  if (creditScore < 650) {
    return 'Needs Review';
  }

  if (creditScore > 700) {
    return 'Approved';
  }

  return 'Needs Review';
}

async function readDb() {
  try {
    const raw = await fs.readFile(RUNTIME_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    const raw = await fs.readFile(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    await writeDb(data);
    return data;
  }
}

async function writeDb(data) {
  await fs.writeFile(RUNTIME_DB_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function ensureRuntimeDb() {
  try {
    await fs.access(RUNTIME_DB_PATH);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    const raw = await fs.readFile(DB_PATH, 'utf8');
    await fs.writeFile(RUNTIME_DB_PATH, `${JSON.stringify(JSON.parse(raw), null, 2)}\n`, 'utf8');
  }
}

async function parseRequestBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

function isTrustedWriteRequest(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  return TRUSTED_ORIGINS.has(origin);
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/applications') {
    const db = await readDb();
    sendJson(req, res, 200, { applications: db.applications || [] });
    return true;
  }

  const decisionMatch = pathname.match(/^\/api\/applications\/([^/]+)\/loan-decision$/);
  if (req.method === 'GET' && decisionMatch) {
    const applicationId = decodeURIComponent(decisionMatch[1]);
    const db = await readDb();
    const application = (db.applications || []).find((app) => app.ApplicationID === applicationId);

    if (!application) {
      sendJson(req, res, 404, { error: 'Application not found.' });
      return true;
    }

    const creditScore = Number(application['Credit Score']);
    if (!Number.isFinite(creditScore)) {
      sendJson(req, res, 422, { error: 'Credit Score is missing or invalid.' });
      return true;
    }

    sendJson(req, res, 200, {
      applicationId,
      creditScore,
      loanDecision: getLoanDecision(creditScore)
    });
    return true;
  }

  const notesMatch = pathname.match(/^\/api\/applications\/([^/]+)\/notes$/);
  if (req.method === 'PUT' && notesMatch) {
    if (!isTrustedWriteRequest(req)) {
      sendJson(req, res, 403, { error: 'Writes are restricted to trusted local origins.' });
      return true;
    }

    const applicationId = decodeURIComponent(notesMatch[1]);
    const body = await parseRequestBody(req);
    const caseNotes = typeof body.caseNotes === 'string' ? body.caseNotes : '';

    const db = await readDb();
    const index = (db.applications || []).findIndex((app) => app.ApplicationID === applicationId);

    if (index === -1) {
      sendJson(req, res, 404, { error: 'Application not found.' });
      return true;
    }

    db.applications[index]['Case Notes'] = caseNotes;
    await writeDb(db);

    sendJson(req, res, 200, {
      success: true,
      application: db.applications[index]
    });
    return true;
  }

  return false;
}

async function handleStatic(req, res, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const normalizedPath = path.posix.normalize(requestedPath);

  if (!PUBLIC_FILES.has(normalizedPath)) {
    sendJson(req, res, 404, { error: 'Not found' });
    return;
  }

  const filePath = path.join(ROOT, normalizedPath.slice(1));

  try {
    setSecurityHeaders(res);
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    sendJson(req, res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    const handled = await handleApi(req, res, pathname);
    if (handled) {
      return;
    }

    await handleStatic(req, res, pathname);
  } catch (error) {
    sendJson(req, res, 500, { error: 'Internal server error' });
  }
});

ensureRuntimeDb()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
      if (HOST === 'localhost') {
        console.log(`Loopback alias: http://127.0.0.1:${PORT}`);
      }
      console.log(`Runtime data file: ${RUNTIME_DB_PATH}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize runtime database:', error);
    process.exit(1);
  });
