// Run after npm run build. Set PLAYWRIGHT_MODULE if not installed locally; BROWSER_CHANNEL=chrome can use installed Chrome.
import { createApp } from '../server/index.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dataDir = mkdtempSync(join(tmpdir(), 'ew-browser-'));
const origin = 'http://127.0.0.1:31889';
const server = createApp({ dataDir, origin, password: 'browser-test-password' });
await new Promise(r => server.listen(31889, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await page.goto(origin);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByPlaceholder('输入管理密钥...').fill('browser-test-password');
  await page.getByRole('button', { name: '授权登录', exact: true }).click();

  await page.getByRole('button', { name: '发布', exact: true }).click();
  await page.getByPlaceholder('输入标题...').fill('Browser publication test');
  await page.getByPlaceholder('# 在此输入内容 (支持 Markdown)...').fill('Published from the existing editor.');
  const saved = page.waitForResponse(r => r.url().endsWith('/api/content') && r.request().method() === 'PUT' && r.status() === 200);
  await page.getByRole('button', { name: '保存条目', exact: true }).click();
  await saved;
  assert.equal(await page.getByRole('button', { name: '发布到网站', exact: true }).count(), 0);
  const visitor = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await visitor.goto(origin);
  await visitor.getByText('Browser publication test', { exact: true }).first().waitFor();
  assert.equal(await visitor.getByRole('button', { name: '发布到网站', exact: true }).count(), 0);
  assert.equal(await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

  await page.goto(origin + '/#/dashboard');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  const nameInput = page.locator('input').nth(1);
  const originalName = await nameInput.inputValue();
  let writes = 0;
  await page.route('**/api/content', async route => {
    if (route.request().method() === 'PUT') { writes++; if (writes === 1) await new Promise(r => setTimeout(r, 1200)); }
    await route.continue();
  });
  const firstRequest = page.waitForRequest(r => r.url().endsWith('/api/content') && r.method() === 'PUT');
  await nameInput.fill('First pending name'); await firstRequest;
  await nameInput.fill('Final queued name');
  await page.waitForResponse(async r => r.url().endsWith('/api/content') && r.request().method() === 'PUT' && r.request().postDataJSON().content.siteConfig.siteName === 'Final queued name' && r.status() === 200);
  assert.ok(writes >= 2);
  assert.equal((await (await fetch(origin + '/api/content')).json()).content.siteConfig.siteName, 'Final queued name');
  await page.unroute('**/api/content');
  await page.route('**/api/content', route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'test offline' }) }) : route.continue());
  await nameInput.fill('Retry name');
  await page.getByRole('alert').waitFor();
  assert.equal(await nameInput.inputValue(), 'Retry name');
  await page.unroute('**/api/content');
  const retried = page.waitForResponse(r => r.url().endsWith('/api/content') && r.request().method() === 'PUT' && r.status() === 200);
  await page.getByRole('button', { name: '重试保存', exact: true }).click(); await retried;
  assert.equal((await (await fetch(origin + '/api/content')).json()).content.siteConfig.siteName, 'Retry name');
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: login, existing editor, autosave, fresh visitor, mobile width.');
} finally {
  await browser?.close(); await new Promise(r => { server.close(r); server.closeAllConnections(); });
  rmSync(dataDir, { recursive: true, force: true });
}
