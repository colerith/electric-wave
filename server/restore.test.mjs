import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { restoreArticles } from './restore-articles.mjs';
test('restoration backs up, preserves server-only data, and never reimports on restart', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'ew-restore-'));
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE content(id INTEGER PRIMARY KEY, revision INTEGER, body TEXT); CREATE TABLE history(revision INTEGER PRIMARY KEY, body TEXT, saved_at TEXT)');
    const file = new URL('./recovery/articles-2026-10-11.json', import.meta.url);
    const incoming = JSON.parse(readFileSync(file));
    const old = { posts: [{ ...incoming.posts[0], title: 'outdated' }, { ...incoming.posts[0], id: 'server-only' }], categories: ['server-category'], announcements: [], links: [], siteConfig: { siteName: 'server-name', avatarUrl: '', startDate: '2025-01-01' }, dailyWaveConfig: { items: [{ id: 'wave', content: 'server-wave' }] }, editedTimeMap: {} };
    db.prepare('INSERT INTO content VALUES(1, 8, ?)').run(JSON.stringify(old));
    assert.equal(restoreArticles(db, dir, file), true);
    let row = db.prepare('SELECT * FROM content').get();
    const restored = JSON.parse(row.body);
    assert.equal(restored.posts.length, incoming.posts.length + 1);
    assert.equal(restored.posts[0].title, incoming.posts[0].title);
    assert.equal(restored.siteConfig.siteName, 'server-name');
    assert.ok(restored.categories.includes('server-category'));
    const backup = readdirSync(resolve(dir, 'recovery-backups'))[0];
    assert.deepEqual(JSON.parse(readFileSync(resolve(dir, 'recovery-backups', backup))).content, old);
    restored.posts[0].title = 'edited after recovery';
    db.prepare('UPDATE content SET body=?').run(JSON.stringify(restored));
    assert.equal(restoreArticles(db, dir, file), false);
    assert.equal(JSON.parse(db.prepare('SELECT body FROM content').get().body).posts[0].title, 'edited after recovery');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
