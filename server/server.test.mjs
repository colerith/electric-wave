import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './index.mjs';

test('authentication, publication, conflicts, uploads and persistence', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'ew-test-'));
  const options = { dataDir, password: 'test-password-unique', origin: 'http://localhost:3000' };
  let server = createApp(options);
  const start = async () => { await new Promise(r => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${server.address().port}`; };
  let base = await start();
  const stop = () => new Promise(r => { server.close(r); server.closeAllConnections(); });
  const call = (path, method = 'GET', body, cookie = '', origin = options.origin) => fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', 'X-EW-Request': '1', Origin: origin, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    const original = await (await call('/content')).json();
    assert.ok(original.content.posts.length);
    assert.equal((await call('/content', 'PUT', original)).status, 401);
    assert.equal((await call('/login', 'POST', { password: options.password }, '', 'https://evil.example')).status, 403);
    assert.equal((await call('/login', 'POST', { password: 'wrong' })).status, 401);
    const login = await call('/login', 'POST', { password: options.password });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await (await call('/session', 'GET', undefined, cookie)).json()).authenticated, true);
    assert.equal((await call('/content', 'PUT', { ...original, content: {} }, cookie)).status, 400);
    original.content.siteConfig.siteName = 'Published test';
    assert.equal((await call('/content', 'PUT', original, cookie)).status, 200);
    assert.equal((await call('/content', 'PUT', original, cookie)).status, 409);
    assert.equal((await (await call('/content')).json()).content.siteConfig.siteName, 'Published test');
    const upload = await fetch(base + '/api/uploads', { method: 'POST', headers: { Origin: options.origin, 'X-EW-Request': '1', Cookie: cookie, 'Content-Type': 'image/png' }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    assert.equal(upload.status, 201);
    const { url } = await upload.json();
    assert.equal((await fetch(base + url)).headers.get('content-type'), 'image/png');
    assert.equal((await fetch(base + '/api/uploads', { method: 'POST', headers: { Origin: options.origin, 'X-EW-Request': '1', Cookie: cookie, 'Content-Type': 'image/svg+xml' }, body: '<svg/>' })).status, 400);
    assert.equal((await fetch(base + '/.env')).status, 404);
    await call('/logout', 'POST', {}, cookie);
    assert.equal((await call('/content', 'PUT', original, cookie)).status, 401);
    await stop(); server = createApp(options); base = await start();
    assert.equal((await (await call('/content')).json()).content.siteConfig.siteName, 'Published test');
    assert.equal((await fetch(base + url)).status, 200);
    assert.equal((await (await call('/session', 'GET', undefined, cookie)).json()).authenticated, false);
  } finally { await stop(); rmSync(dataDir, { recursive: true, force: true }); }
});
