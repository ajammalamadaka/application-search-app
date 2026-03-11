const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'db.json');
const RUNTIME_DB_PATH = path.join(ROOT, 'db.runtime.json');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
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

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/applications') {
    const db = await readDb();
    sendJson(res, 200, { applications: db.applications || [] });
    return true;
  }

  const notesMatch = pathname.match(/^\/api\/applications\/([^/]+)\/notes$/);
  if (req.method === 'PUT' && notesMatch) {
    const applicationId = decodeURIComponent(notesMatch[1]);
    const body = await parseRequestBody(req);
    const caseNotes = typeof body.caseNotes === 'string' ? body.caseNotes : '';

    const db = await readDb();
    const index = (db.applications || []).findIndex((app) => app.ApplicationID === applicationId);

    if (index === -1) {
      sendJson(res, 404, { error: 'Application not found.' });
      return true;
    }

    db.applications[index]['Case Notes'] = caseNotes;
    await writeDb(db);

    sendJson(res, 200, {
      success: true,
      application: db.applications[index]
    });
    return true;
  }

  return false;
}

async function handleStatic(req, res, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requestedPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    setCorsHeaders(res);

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
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

ensureRuntimeDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Runtime data file: ${RUNTIME_DB_PATH}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize runtime database:', error);
    process.exit(1);
  });
