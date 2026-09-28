import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const children = [];
const origins = {};
const serverDir = fileURLToPath(new URL('.', import.meta.url));

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function startApi(name, config = {}) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['index.js'], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(port),
      APPWRITE_ENDPOINT: '',
      APPWRITE_PROJECT_ID: '',
      APPWRITE_API_KEY: '',
      APPWRITE_DATABASE_ID: '',
      APPWRITE_REGISTRATIONS_TABLE_ID: '',
      APPWRITE_STORAGE_BUCKET_ID: '',
      APPWRITE_ADMIN_USER_ID: '',
      ALLOWED_ORIGINS: '',
      ...config,
    },
    stdio: 'ignore',
  });
  children.push(child);
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) {
        origins[name] = origin;
        return;
      }
    } catch { /* Wait briefly for the child process to bind. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API test server '${name}' did not start in time`);
}

before(async () => {
  await startApi('unconfigured');
  await startApi('configured', {
    APPWRITE_ENDPOINT: 'https://example.invalid/v1',
    APPWRITE_PROJECT_ID: 'test-project-id',
    APPWRITE_API_KEY: 'test-only-not-a-secret',
    APPWRITE_DATABASE_ID: 'test-database-id',
    APPWRITE_REGISTRATIONS_TABLE_ID: 'test-registrations-table',
    APPWRITE_STORAGE_BUCKET_ID: 'test-private-bucket',
    APPWRITE_ADMIN_USER_ID: 'test-admin-user-id',
  });
});

after(() => {
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
});

describe('private API fail-closed behavior', () => {
  it('reports incomplete Appwrite configuration without exposing keys', async () => {
    const response = await fetch(`${origins.unconfigured}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.configured, false);
    assert.equal('apiKey' in body, false);
  });

  it('does not accept applicant data before secure storage is configured', async () => {
    const form = new FormData();
    form.set('firstName', 'Test applicant');
    const response = await fetch(`${origins.unconfigured}/api/submissions`, { method: 'POST', body: form });
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /not configured/i);
  });

  it('requires an academy JWT on record and file routes even when the backend is configured', async () => {
    const [records, file] = await Promise.all([
      fetch(`${origins.configured}/api/submissions`),
      fetch(`${origins.configured}/api/files/private-file-id`),
    ]);
    assert.equal(records.status, 401);
    assert.equal(file.status, 401);
    assert.doesNotMatch(await records.text(), /rows|applicant/i);
  });

  it('rejects requests from unapproved browser origins', async () => {
    const response = await fetch(`${origins.configured}/api/submissions`, { headers: { Origin: 'https://unauthorised.example' } });
    assert.equal(response.status, 403);
  });

  it('serves a no-index sign-in portal without rendering applicant records', async () => {
    const response = await fetch(`${origins.unconfigured}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, /Sign in to admin/);
    assert.doesNotMatch(html, /Test applicant/);
  });
});
