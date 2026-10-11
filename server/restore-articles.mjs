import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { validateContent } from '../services/content-validation.mjs';

// A content-addressed, one-time migration. Never reset a live database from seed data.
export function restoreArticles(db, dataDir, file) {
  const raw = readFileSync(file, 'utf8');
  const id = 'articles-' + createHash('sha256').update(raw).digest('hex');
  const incoming = JSON.parse(raw);
  db.exec('CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT id FROM migrations WHERE id=?').get(id)) { db.exec('COMMIT'); return false; }
    const row = db.prepare('SELECT * FROM content WHERE id=1').get();
    const previous = JSON.parse(row.body);
    const ids = new Set(incoming.posts.map(p => p.id));
    const posts = [...incoming.posts, ...previous.posts.filter(p => !ids.has(p.id))];
    const content = validateContent({ ...previous, posts, categories: [...new Set([...incoming.categories, ...previous.categories, ...posts.map(p => p.category)])] });
    mkdirSync(resolve(dataDir, 'recovery-backups'), { recursive: true });
    writeFileSync(resolve(dataDir, 'recovery-backups', `${id}-revision-${row.revision}.json`), JSON.stringify({ revision: row.revision, content: previous }, null, 2), { mode: 0o600 });
    db.prepare('INSERT OR IGNORE INTO history VALUES (?, ?, ?)').run(row.revision, row.body, new Date().toISOString());
    db.prepare('UPDATE content SET revision=?, body=? WHERE id=1').run(row.revision + 1, JSON.stringify(content));
    db.prepare('INSERT INTO migrations VALUES (?, ?)').run(id, new Date().toISOString());
    db.exec('COMMIT');
    return true;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
